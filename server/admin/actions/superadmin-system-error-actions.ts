"use server";

import { requireSuperAdmin } from "@/server/admin/context";

export type SuperAdminSystemError = {
  id: string;
  referenceCode: string;
  fingerprint: string;
  source: "web" | "server_action" | "route" | "render" | "proxy";
  severity: "warning" | "error" | "fatal";
  message: string;
  stackTrace: string | null;
  context: Record<string, unknown>;
  route: string | null;
  method: string | null;
  errorType: string | null;
  requestId: string | null;
  digest: string | null;
  occurrenceCount: number;
  firstSeen: string;
  lastSeen: string;
  resolvedAt: string | null;
};

type SystemErrorRow = {
  id: string;
  reference_code: string;
  fingerprint: string;
  source: SuperAdminSystemError["source"];
  severity: SuperAdminSystemError["severity"];
  message: string;
  stack_trace: string | null;
  context: Record<string, unknown> | null;
  route: string | null;
  method: string | null;
  error_type: string | null;
  request_id: string | null;
  digest: string | null;
  occurrence_count: number;
  first_seen: string;
  last_seen: string;
  resolved_at: string | null;
};

export async function getSuperAdminSystemErrors(): Promise<SuperAdminSystemError[]> {
  const { supabase } = await requireSuperAdmin();
  const { data, error } = await supabase
    .from("system_error_groups")
    .select(
      "id,reference_code,fingerprint,source,severity,message,stack_trace,context,route,method,error_type,request_id,digest,occurrence_count,first_seen,last_seen,resolved_at",
    )
    .order("resolved_at", { ascending: true, nullsFirst: true })
    .order("last_seen", { ascending: false })
    .limit(200);

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST202" || error.code === "PGRST205") {
      return [];
    }
    throw new Error(`Unable to load system errors: ${error.message}`);
  }

  return ((data ?? []) as SystemErrorRow[]).map((row) => ({
    id: row.id,
    referenceCode: row.reference_code,
    fingerprint: row.fingerprint,
    source: row.source,
    severity: row.severity,
    message: row.message,
    stackTrace: row.stack_trace,
    context: row.context ?? {},
    route: row.route,
    method: row.method,
    errorType: row.error_type,
    requestId: row.request_id,
    digest: row.digest,
    occurrenceCount: row.occurrence_count,
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
    resolvedAt: row.resolved_at,
  }));
}

export async function setSuperAdminSystemErrorResolved(
  errorId: string,
  resolved: boolean,
): Promise<void> {
  const { supabase, user } = await requireSuperAdmin();
  const id = errorId.trim();
  if (!id) throw new Error("System error is required.");

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("system_error_groups")
    .update({
      resolved_at: resolved ? now : null,
      resolved_by: resolved ? user.id : null,
      updated_at: now,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Unable to update system error: ${error.message}`);
  if (!data) throw new Error("System error not found.");
}
