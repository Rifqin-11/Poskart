"use server";

import { requireSuperAdmin } from "@/server/admin/context";

export type SuperAdminSystemLog = {
  id: string;
  eventId: string;
  traceId: string | null;
  requestId: string | null;
  level: "debug" | "info" | "warning" | "error" | "fatal";
  service: string;
  module: string | null;
  eventName: string;
  message: string;
  organizationId: string | null;
  actorId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export async function getSuperAdminSystemLogs(): Promise<SuperAdminSystemLog[]> {
  const { supabase } = await requireSuperAdmin();
  const { data, error } = await supabase
    .from("system_logs")
    .select("id,event_id,trace_id,request_id,level,service,module,event_name,message,organization_id,actor_id,resource_type,resource_id,metadata,created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST202" || error.code === "PGRST205") return [];
    throw new Error(`Unable to load system logs: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    eventId: row.event_id,
    traceId: row.trace_id,
    requestId: row.request_id,
    level: row.level,
    service: row.service,
    module: row.module,
    eventName: row.event_name,
    message: row.message,
    organizationId: row.organization_id,
    actorId: row.actor_id,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  }));
}
