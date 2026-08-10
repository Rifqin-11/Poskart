import { createHash } from "node:crypto";

import {
  jsonError,
  jsonOk,
  KioskApiError,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";

const categories = new Set([
  "startup",
  "runtime",
  "payment",
  "camera",
  "printer",
  "upload",
  "sync",
  "unknown",
]);
const severities = new Set(["warning", "error", "fatal"]);
const allowedContextKeys = new Set([
  "operation",
  "screen",
  "route",
  "provider",
  "statusCode",
  "errorType",
]);

type DeviceErrorInput = {
  eventId?: unknown;
  category?: unknown;
  severity?: unknown;
  message?: unknown;
  stackTrace?: unknown;
  context?: unknown;
  appVersion?: unknown;
  occurrenceCount?: unknown;
  firstOccurredAt?: unknown;
  lastOccurredAt?: unknown;
};

type DeviceErrorsBody = {
  deviceId?: unknown;
  appVersion?: unknown;
  errors?: unknown;
};

function cleanSensitiveText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(
      /\b(api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|pin)\s*[:=]\s*[^\s,;]+/gi,
      "$1=[redacted]",
    )
    .replace(
      /([?&](?:token|key|signature|credential|authorization)=)[^&#\s]+/gi,
      "$1[redacted]",
    )
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]")
    .replace(
      /(?:\/storage\/emulated\/\d+|\/data\/user\/\d+|\/Users\/[^/\s]+)[^\s]*/g,
      "[local-path]",
    )
    .slice(0, maxLength)
    .trim();
}

function normalizeForFingerprint(value: string) {
  return value
    .toLowerCase()
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
      "[uuid]",
    )
    .replace(/\b\d{4,}\b/g, "[number]")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeContext(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const context: Record<string, string | number | boolean> = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (!allowedContextKeys.has(key)) continue;
    if (
      typeof rawValue === "number" ||
      typeof rawValue === "boolean"
    ) {
      context[key] = rawValue;
    } else if (typeof rawValue === "string") {
      context[key] = cleanSensitiveText(rawValue, 240);
    }
  }
  return context;
}

function safeOccurredAt(value: unknown) {
  if (typeof value !== "string") return new Date().toISOString();
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString()
    : new Date().toISOString();
}

function sanitizeDeviceError(
  raw: DeviceErrorInput,
  fallbackAppVersion: string,
) {
  const category =
    typeof raw.category === "string" && categories.has(raw.category)
      ? raw.category
      : "runtime";
  const severity =
    typeof raw.severity === "string" && severities.has(raw.severity)
      ? raw.severity
      : "error";
  const message =
    cleanSensitiveText(raw.message, 2000) || "Unknown device error";
  const stackTrace = cleanSensitiveText(raw.stackTrace, 12000);
  const stackFingerprint = stackTrace.split("\n").slice(0, 3).join("\n");
  const fingerprint = createHash("sha256")
    .update(
      `${category}\n${normalizeForFingerprint(message)}\n${normalizeForFingerprint(stackFingerprint)}`,
    )
    .digest("hex");
  const count =
    typeof raw.occurrenceCount === "number" &&
    Number.isFinite(raw.occurrenceCount)
      ? Math.max(1, Math.min(1000, Math.round(raw.occurrenceCount)))
      : 1;

  return {
    eventId:
      typeof raw.eventId === "string"
        ? cleanSensitiveText(raw.eventId, 120)
        : "",
    fingerprint,
    category,
    severity,
    message,
    stackTrace: stackTrace || null,
    context: sanitizeContext(raw.context),
    appVersion:
      cleanSensitiveText(raw.appVersion, 120) || fallbackAppVersion || null,
    occurrenceCount: count,
    firstOccurredAt: safeOccurredAt(raw.firstOccurredAt),
    lastOccurredAt: safeOccurredAt(raw.lastOccurredAt),
  };
}

export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = (await request.json()) as DeviceErrorsBody;
    const deviceId =
      typeof body.deviceId === "string" ? body.deviceId.trim() : "";
    const device = await requireOrganizationDevice(context, deviceId);
    if (!Array.isArray(body.errors)) {
      throw new KioskApiError(
        "errors must be an array.",
        400,
        "DEVICE_ERRORS_REQUIRED",
      );
    }

    const fallbackAppVersion = cleanSensitiveText(body.appVersion, 120);
    const errors = body.errors
      .slice(0, 20)
      .filter(
        (item): item is DeviceErrorInput =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
      .map((item) => sanitizeDeviceError(item, fallbackAppVersion));

    if (errors.length === 0) return jsonOk({ accepted: [], recorded: 0 });

    const { data, error } = await context.client.rpc(
      "record_device_error_batch",
      {
        p_organization_id: context.organizationId,
        p_device_id: device.id,
        p_errors: errors,
      },
    );
    if (error) throw error;

    if (
      device.status !== "maintenance" &&
      errors.some(
        (item) => item.severity === "error" || item.severity === "fatal",
      )
    ) {
      const now = new Date().toISOString();
      const { error: statusError } = await context.client
        .from("devices")
        .update({ status: "error", last_sync: now, updated_at: now })
        .eq("id", device.id)
        .eq("organization_id", context.organizationId);
      if (statusError) {
        console.error(
          `[device-errors] unable to mark ${device.id} as error: ${statusError.message}`,
        );
      }
    }

    return jsonOk({
      accepted: errors.map((item) => ({
        eventId: item.eventId,
        occurrenceCount: item.occurrenceCount,
      })),
      recorded: typeof data === "number" ? data : errors.length,
    });
  } catch (error) {
    return jsonError(error);
  }
}
