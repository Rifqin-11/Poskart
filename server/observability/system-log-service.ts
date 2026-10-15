import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type SystemLogLevel = "debug" | "info" | "warning" | "error" | "fatal";

export type RecordSystemLogInput = {
  level?: SystemLogLevel;
  service?: string;
  module?: string;
  event: string;
  message: string;
  traceId?: string | null;
  requestId?: string | null;
  organizationId?: string | null;
  actorId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
};

function safeMetadata(metadata: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) =>
      ["string", "number", "boolean"].includes(typeof value) || value === null,
    ),
  );
}

function redact(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/\b(api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|password|pin|secret)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]")
}

export async function recordSystemLog(input: RecordSystemLogInput) {
  const eventId = `log_${crypto.randomUUID()}`;
  try {
    const { error } = await createSupabaseAdminClient().from("system_logs").insert({
      event_id: eventId,
      trace_id: input.traceId ?? null,
      request_id: input.requestId ?? null,
      level: input.level ?? "info",
      service: input.service ?? "poskart-admin",
      module: input.module ?? null,
      event_name: input.event,
      message: redact(input.message).slice(0, 4000),
      organization_id: input.organizationId ?? null,
      actor_id: input.actorId ?? null,
      resource_type: input.resourceType ?? null,
      resource_id: input.resourceId ?? null,
      metadata: safeMetadata(input.metadata ?? {}),
    });
    if (error) console.error("[system-log] insert failed", error);
  } catch (error) {
    console.error("[system-log] unavailable", error);
  }
  return eventId;
}
