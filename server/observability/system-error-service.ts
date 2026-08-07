import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ServerErrorSource =
  | "web"
  | "server_action"
  | "route"
  | "render"
  | "proxy";

export type RecordServerErrorInput = {
  error: unknown;
  source?: ServerErrorSource;
  route?: string | null;
  method?: string | null;
  requestId?: string | null;
  digest?: string | null;
  context?: Record<string, unknown>;
};

function redact(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(
      /\b(api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|password|pin|secret)\s*[:=]\s*[^\s,;]+/gi,
      "$1=[redacted]",
    )
    .replace(/([?&](?:token|key|signature|credential|authorization)=)[^&#\s]+/gi, "$1[redacted]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]")
    .replace(/\/Users\/[^/\s]+/g, "[local-path]")
    .slice(0, maxLength)
    .trim();
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, "[uuid]")
    .replace(/\b\d{4,}\b/g, "[number]")
    .replace(/\s+/g, " ")
    .trim();
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function referenceCode(fingerprint: string) {
  // Deterministic references keep the same error group searchable over time.
  return `ERR-${fingerprint.slice(0, 12).toUpperCase()}`;
}

function errorParts(error: unknown) {
  const message = redact(error instanceof Error ? error.message : error, 4000);
  const stackTrace = redact(error instanceof Error ? error.stack : "", 16000);
  return {
    message: message || "Unknown server error",
    stackTrace: stackTrace || null,
    errorType: error instanceof Error ? error.constructor.name : typeof error,
  };
}

/** Records technical details for Superadmin while never sending them to users. */
export async function recordServerError({
  error,
  source = "web",
  route,
  method,
  requestId,
  digest,
  context = {},
}: RecordServerErrorInput) {
  try {
    const parts = errorParts(error);
    const normalizedMessage = normalize(parts.message);
    const fingerprint = await sha256(
      `${source}\n${route ?? ""}\n${normalizedMessage}`,
    );
    const safeContext = Object.fromEntries(
      Object.entries(context)
        .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
        .map(([key, value]) => [key, typeof value === "string" ? redact(value, 300) : value]),
    );

    const { error: insertError } = await createSupabaseAdminClient()
      .from("system_error_groups")
      .upsert(
        {
          reference_code: referenceCode(fingerprint),
          fingerprint,
          source,
          severity: "error",
          message: parts.message,
          stack_trace: parts.stackTrace,
          context: safeContext,
          route: redact(route, 500) || null,
          method: redact(method, 20) || null,
          error_type: redact(parts.errorType, 120) || null,
          request_id: redact(requestId, 160) || null,
          digest: redact(digest, 160) || null,
          occurrence_count: 1,
          last_seen: new Date().toISOString(),
          resolved_at: null,
          resolved_by: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "fingerprint" },
      );

    if (insertError) console.error("[system-error-log] insert failed", insertError);
  } catch (loggingError) {
    // Error logging must never break the request that is already failing.
    console.error("[system-error-log] unavailable", loggingError);
  }
}
