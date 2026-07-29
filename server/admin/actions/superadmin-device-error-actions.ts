"use server";

import { requireSuperAdmin } from "@/server/admin/context";
import type {
  DeviceErrorCategory,
  DeviceErrorGroup,
  DeviceErrorSeverity,
} from "@/types/device-error";

type DeviceErrorRow = {
  id: string;
  organization_id: string;
  device_id: string;
  category: DeviceErrorCategory;
  severity: DeviceErrorSeverity;
  message: string;
  stack_trace: string | null;
  context: Record<string, unknown> | null;
  app_version: string | null;
  occurrence_count: number;
  first_seen: string;
  last_seen: string;
  resolved_at: string | null;
  devices:
    | { id: string; name: string; location: string | null }
    | Array<{ id: string; name: string; location: string | null }>
    | null;
  organizations:
    { id: string; name: string } | Array<{ id: string; name: string }> | null;
};

export type SuperAdminDeviceError = DeviceErrorGroup & {
  deviceName: string;
  deviceLocation: string | null;
  organizationName: string;
};

export async function getSuperAdminDeviceErrors(): Promise<
  SuperAdminDeviceError[]
> {
  const { supabase } = await requireSuperAdmin();
  const { data, error } = await supabase
    .from("device_error_groups")
    .select(
      "id,organization_id,device_id,category,severity,message,stack_trace,context,app_version,occurrence_count,first_seen,last_seen,resolved_at,devices(id,name,location),organizations(id,name)",
    )
    .order("resolved_at", { ascending: true, nullsFirst: true })
    .order("last_seen", { ascending: false })
    .limit(200);

  if (error) {
    if (
      error.code === "42P01" ||
      error.code === "PGRST202" ||
      error.code === "PGRST205"
    ) {
      return [];
    }
    throw new Error(`Unable to load device errors: ${error.message}`);
  }

  return ((data ?? []) as DeviceErrorRow[]).map((row) => {
    const device = Array.isArray(row.devices) ? row.devices[0] : row.devices;
    const organization = Array.isArray(row.organizations)
      ? row.organizations[0]
      : row.organizations;
    return {
      id: row.id,
      deviceId: row.device_id,
      deviceName: device?.name ?? row.device_id,
      deviceLocation: device?.location ?? null,
      organizationName: organization?.name ?? row.organization_id,
      category: row.category,
      severity: row.severity,
      message: row.message,
      stackTrace: row.stack_trace,
      context: row.context ?? {},
      appVersion: row.app_version,
      occurrenceCount: row.occurrence_count,
      firstSeen: row.first_seen,
      lastSeen: row.last_seen,
      resolvedAt: row.resolved_at,
    };
  });
}

export async function setSuperAdminDeviceErrorResolved(
  errorId: string,
  resolved: boolean,
): Promise<void> {
  const { supabase, user } = await requireSuperAdmin();
  const id = errorId.trim();
  if (!id) throw new Error("Device error is required.");

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("device_error_groups")
    .update({
      resolved_at: resolved ? now : null,
      resolved_by: resolved ? user.id : null,
      updated_at: now,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Unable to update device error: ${error.message}`);
  if (!data) throw new Error("Device error not found.");
}
