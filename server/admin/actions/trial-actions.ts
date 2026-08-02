"use server";

import { getAdminContext, getAdminProfileRole } from "@/server/admin/context";
import { getServiceRoleClient } from "@/lib/supabase/server";
import { createAdminNotification } from "@/server/admin/notifications";
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
       requester:profiles!requester_profile_id(email)`,
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
       requester:profiles!requester_profile_id(email)`,
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
  const { user } = await getAdminContext();
  const serviceRoleClient = await getServiceRoleClient();

  // Set reviewed_by directly via update before calling RPC
  // (RPC has no auth.uid() when called with service role key)
  await serviceRoleClient
    .from("trial_requests")
    .update({ reviewed_by: user.id })
    .eq("id", input.requestId);

  const { error } = await serviceRoleClient.rpc("review_trial_request", {
    p_request_id: input.requestId,
    p_decision: input.decision,
    p_note: input.note ?? null,
    p_rejection_code: input.rejectionCode ?? null,
  });

  if (error) throw new Error(`Gagal memproses review: ${error.message}`);

  // Auto-activate immediately on approval — no device activation step needed
  if (input.decision === "approved") {
    const { data: req } = await serviceRoleClient
      .from("trial_requests")
      .select("organization_id")
      .eq("id", input.requestId)
      .single();

    if (req?.organization_id) {
      const { error: activateError } = await serviceRoleClient.rpc(
        "activate_approved_trial",
        { p_request_id: input.requestId, p_organization_id: req.organization_id },
      );
      if (activateError) throw new Error(`Gagal mengaktifkan trial: ${activateError.message}`);

      // Send 2 welcome notifications to the organization
      await createAdminNotification(serviceRoleClient as never, {
        audience: "organization",
        organizationId: req.organization_id,
        type: "trial_activated",
        title: "Trial 14 hari Anda telah aktif!",
        body: "Selamat! Akses penuh fitur Starter kini tersedia. Mulai eksplorasi dashboard, buat frame, dan siapkan kiosk Anda.",
      });
      await createAdminNotification(serviceRoleClient as never, {
        audience: "organization",
        organizationId: req.organization_id,
        type: "trial_setup_guide",
        title: "Cara memulai: pasangkan device kiosk",
        body: "Login ke aplikasi POSKART di tablet Anda, lalu masuk ke Settings > Pair Device dan masukkan kode yang muncul di halaman Devices pada dashboard.",
        href: "/devices",
      });
    }
  }
}

export async function revokeTrialByRequestId(
  requestId: string,
  reason: string,
): Promise<void> {
  await requireSuperAdmin();
  const { user } = await getAdminContext();
  const serviceRoleClient = await getServiceRoleClient();

  const { data: claim } = await serviceRoleClient
    .from("trial_claims")
    .select("id, organization_id")
    .eq("request_id", requestId)
    .eq("status", "active")
    .maybeSingle();

  if (!claim) throw new Error("Tidak ada trial aktif untuk request ini.");

  const { error: claimError } = await serviceRoleClient
    .from("trial_claims")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: user.id,
      revoke_reason: reason,
    })
    .eq("id", claim.id);

  if (claimError) throw new Error(`Gagal merevoke trial: ${claimError.message}`);

  // Revert subscription to free
  const { error: subError } = await serviceRoleClient
    .from("subscriptions")
    .update({ status: "free", plan_id: "free", current_period_end: null })
    .eq("organization_id", claim.organization_id);

  if (subError) throw new Error(`Gagal mereset subscription: ${subError.message}`);

  // Mark request as canceled
  await serviceRoleClient
    .from("trial_requests")
    .update({ status: "canceled" })
    .eq("id", requestId);
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

export async function submitTrialRequest(input?: {
  hardwareIdHash?: string | null;
}): Promise<{ requestId: string; autoRejected: boolean; rejectionCode: string | null }> {
  const { supabase, user } = await getAdminContext();

  // 3 trial submissions per user per 24 hours (anti-spam)
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const adminClient = createSupabaseAdminClient();
  const { data: rlAllowed } = await adminClient.rpc("check_rate_limit", {
    p_key: `trial_submit:${user.id}`,
    p_window_secs: 86400,
    p_max: 3,
  });
  if (rlAllowed === false) {
    throw new Error("Terlalu banyak permintaan trial. Coba lagi besok.");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .eq("role", "owner")
    .maybeSingle();

  if (!membership) throw new Error("Hanya pemilik organisasi yang dapat mengajukan trial.");

  const { data, error } = await supabase.rpc("submit_trial_request", {
    p_organization_id: membership.organization_id,
    p_device_id: null,
    p_hardware_id_hash: input?.hardwareIdHash ?? null, // passed from device via UI
    p_contact_phone: null,
    p_business_name: null,
    p_city: null,
    p_intended_use: null,
    p_event_date: null,
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
       requester:profiles!requester_profile_id(email)`,
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
