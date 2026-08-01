"use server";

import { getAdminContext } from "@/server/admin/context";
import { getAdminProfileRole } from "@/server/admin/context";
import { getServiceRoleClient } from "@/lib/supabase/server";
import type {
  TrialRequest,
  TrialRequestFilters,
  ReviewTrialRequestInput,
} from "@/types/trial";

type TrialRequestRow = {
  id: string;
  organization_id: string;
  requester_profile_id: string;
  device_id: string | null;
  hardware_id_hash: string | null;
  email_snapshot: string;
  contact_phone: string | null;
  business_name: string | null;
  city: string | null;
  intended_use: string | null;
  event_date: string | null;
  status: string;
  risk_flags: string[];
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  rejection_code: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  activation_deadline: string | null;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
  organization: { name: string | null } | null;
  requester: { email: string | null } | null;
};

function mapTrialRequest(row: TrialRequestRow): TrialRequest {
  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationName: row.organization?.name ?? null,
    requesterProfileId: row.requester_profile_id,
    requesterEmail: row.requester?.email ?? row.email_snapshot,
    deviceId: row.device_id,
    hardwareIdHash: row.hardware_id_hash,
    emailSnapshot: row.email_snapshot,
    contactPhone: row.contact_phone,
    businessName: row.business_name,
    city: row.city,
    intendedUse: row.intended_use,
    eventDate: row.event_date,
    status: row.status as TrialRequest["status"],
    riskFlags: (row.risk_flags ?? []) as TrialRequest["riskFlags"],
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
    rejectionCode: row.rejection_code,
    rejectionReason: row.rejection_reason,
    approvedAt: row.approved_at,
    activationDeadline: row.activation_deadline,
    activatedAt: row.activated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function requireSuperAdmin() {
  const role = await getAdminProfileRole();
  if (role !== "admin") throw new Error("Akses ditolak.");
}

export async function listTrialRequests(
  filters: TrialRequestFilters = {},
): Promise<{ items: TrialRequest[]; total: number }> {
  await requireSuperAdmin();
  const serviceRoleClient = await getServiceRoleClient();

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = serviceRoleClient
    .from("trial_requests")
    .select(
      `id, organization_id, requester_profile_id, device_id, hardware_id_hash,
       email_snapshot, contact_phone, business_name, city, intended_use, event_date,
       status, risk_flags, reviewed_by, reviewed_at, review_note,
       rejection_code, rejection_reason, approved_at, activation_deadline,
       activated_at, created_at, updated_at,
       organization:organizations(name),
       requester:profiles(email)`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`Gagal memuat trial requests: ${error.message}`);

  return {
    items: ((data ?? []) as unknown as TrialRequestRow[]).map(mapTrialRequest),
    total: count ?? 0,
  };
}

export async function getTrialRequestDetail(id: string): Promise<TrialRequest> {
  await requireSuperAdmin();
  const serviceRoleClient = await getServiceRoleClient();

  const { data, error } = await serviceRoleClient
    .from("trial_requests")
    .select(
      `id, organization_id, requester_profile_id, device_id, hardware_id_hash,
       email_snapshot, contact_phone, business_name, city, intended_use, event_date,
       status, risk_flags, reviewed_by, reviewed_at, review_note,
       rejection_code, rejection_reason, approved_at, activation_deadline,
       activated_at, created_at, updated_at,
       organization:organizations(name),
       requester:profiles(email)`,
    )
    .eq("id", id)
    .single();

  if (error) throw new Error(`Gagal memuat detail: ${error.message}`);
  return mapTrialRequest(data as unknown as TrialRequestRow);
}

export async function reviewTrialRequest(
  input: ReviewTrialRequestInput,
): Promise<void> {
  await requireSuperAdmin();
  const serviceRoleClient = await getServiceRoleClient();

  const { error } = await serviceRoleClient.rpc("review_trial_request", {
    p_request_id: input.requestId,
    p_decision: input.decision,
    p_note: input.note ?? null,
    p_rejection_code: input.rejectionCode ?? null,
  });

  if (error) throw new Error(`Gagal memproses review: ${error.message}`);
}

export async function revokeTrialClaim(
  claimId: string,
  reason: string,
): Promise<void> {
  await requireSuperAdmin();
  const { user } = await getAdminContext();
  const serviceRoleClient = await getServiceRoleClient();

  const { error } = await serviceRoleClient
    .from("trial_claims")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: user.id,
      revoke_reason: reason,
    })
    .eq("id", claimId);

  if (error) throw new Error(`Gagal merevoke trial: ${error.message}`);
}

export async function createTrialOverride(
  requestId: string,
  identifierType: "owner_profile" | "hardware_id" | "payout_account",
  identifierValue: string,
  reason: string,
): Promise<void> {
  await requireSuperAdmin();
  const { user } = await getAdminContext();
  const serviceRoleClient = await getServiceRoleClient();

  const { error } = await serviceRoleClient.from("trial_overrides").insert({
    request_id: requestId,
    identifier_type: identifierType,
    identifier_value: identifierValue,
    reason,
    granted_by: user.id,
  });

  if (error) throw new Error(`Gagal membuat override: ${error.message}`);
}

export async function submitTrialRequest(input: {
  organizationId: string;
  deviceId: string;
  hardwareIdHash?: string | null;
  contactPhone?: string | null;
  businessName?: string | null;
  city?: string | null;
  intendedUse?: string | null;
  eventDate?: string | null;
}): Promise<{ requestId: string; autoRejected: boolean; rejectionCode: string | null }> {
  const { supabase } = await getAdminContext();

  const { data, error } = await supabase.rpc("submit_trial_request", {
    p_organization_id: input.organizationId,
    p_device_id: input.deviceId,
    p_hardware_id_hash: input.hardwareIdHash ?? null,
    p_contact_phone: input.contactPhone ?? null,
    p_business_name: input.businessName ?? null,
    p_city: input.city ?? null,
    p_intended_use: input.intendedUse ?? null,
    p_event_date: input.eventDate ?? null,
  });

  if (error) throw new Error(`Gagal mengajukan trial: ${error.message}`);

  return {
    requestId: (data as { request_id: string }).request_id,
    autoRejected: (data as { auto_rejected: boolean }).auto_rejected,
    rejectionCode: (data as { rejection_code: string | null }).rejection_code,
  };
}

export async function getMyTrialRequest(): Promise<TrialRequest | null> {
  const { supabase, user } = await getAdminContext();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("profile_id", user.id)
    .eq("role", "owner")
    .maybeSingle();

  if (!membership) return null;

  const { data, error } = await supabase
    .from("trial_requests")
    .select(
      `id, organization_id, requester_profile_id, device_id, hardware_id_hash,
       email_snapshot, contact_phone, business_name, city, intended_use, event_date,
       status, risk_flags, reviewed_by, reviewed_at, review_note,
       rejection_code, rejection_reason, approved_at, activation_deadline,
       activated_at, created_at, updated_at,
       organization:organizations(name),
       requester:profiles(email)`,
    )
    .eq("organization_id", membership.organization_id)
    .eq("requester_profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Gagal memuat trial request: ${error.message}`);
  if (!data) return null;

  return mapTrialRequest(data as unknown as TrialRequestRow);
}
