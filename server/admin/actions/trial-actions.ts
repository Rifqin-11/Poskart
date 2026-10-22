"use server";

import { getAdminContext, getAdminProfileRole } from "@/server/admin/context";
import { getServiceRoleClient } from "@/lib/supabase/server";
import { createAdminNotification } from "@/server/admin/notifications";
import { revalidatePath } from "next/cache";
import type {
  TrialRequest,
  TrialRequestFilters,
  ReviewTrialRequestInput,
  TrialClaimStatus,
  TrialEligibility,
} from "@/types/trial";

type TrialRequestRow = {
  id: string;
  organization_id: string | null;
  requester_profile_id: string | null;
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
  claims: { status: TrialClaimStatus; ends_at: string; revoke_reason: string | null; started_at: string }[];
};

function mapTrialRequest(row: TrialRequestRow): TrialRequest {
  const claim = [...(row.claims ?? [])].sort((a, b) => b.started_at.localeCompare(a.started_at))[0];
  const claimStatus = claim?.status === "active" && new Date(claim.ends_at).getTime() <= Date.now()
    ? "expired"
    : claim?.status ?? null;
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
    claimStatus,
    trialEndsAt: claim?.ends_at ?? null,
    revokeReason: claim?.revoke_reason ?? null,
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
        requester:profiles!requester_profile_id(email),
        claims:trial_claims(status, ends_at, revoke_reason, started_at)`,
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
        requester:profiles!requester_profile_id(email),
        claims:trial_claims(status, ends_at, revoke_reason, started_at)`,
    )
    .eq("id", id)
    .single();

  if (error) throw new Error(`Gagal memuat detail: ${error.message}`);
  return mapTrialRequest(data as unknown as TrialRequestRow);
}

export async function reviewTrialRequest(
  _input: ReviewTrialRequestInput,
): Promise<void> {
  void _input;
  await requireSuperAdmin();
  throw new Error("Trial tidak lagi memerlukan review. Pemilik organisasi dapat langsung memulai trial.");
}

export async function revokeTrialByRequestId(
  requestId: string,
  reason: string,
): Promise<void> {
  await requireSuperAdmin();
  const { supabase } = await getAdminContext();
  const trimmedReason = reason.trim();
  if (trimmedReason.length < 5 || trimmedReason.length > 1000) {
    throw new Error("Alasan pembatalan harus berisi 5–1000 karakter.");
  }
  const { error } = await supabase.rpc("revoke_trial", {
    p_request_id: requestId,
    p_reason: trimmedReason,
  });
  if (error) throw new Error(`Gagal membatalkan trial: ${error.message}`);
  revalidatePath("/dashboard");
  revalidatePath("/trial");
}

export async function revokeTrialClaim(
  claimId: string,
  reason: string,
): Promise<void> {
  await requireSuperAdmin();
  const serviceRoleClient = await getServiceRoleClient();
  const { data: claim, error } = await serviceRoleClient
    .from("trial_claims")
    .select("request_id")
    .eq("id", claimId)
    .single();
  if (error || !claim) throw new Error("Trial tidak ditemukan.");
  await revokeTrialByRequestId(claim.request_id, reason);
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
}): Promise<{ requestId: string | null; autoRejected: boolean; rejectionCode: string | null; alreadyActive: boolean }> {
  const { supabase, user } = await getAdminContext();

  // 3 trial submissions per user per 24 hours (anti-spam)
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const adminClient = createSupabaseAdminClient();
  const { data: rlAllowed, error: rateLimitError } = await adminClient.rpc("check_rate_limit", {
    p_key: `trial_submit:${user.id}`,
    p_window_secs: 86400,
    p_max: 3,
  });
  if (rateLimitError) throw new Error("Trial belum dapat diproses. Silakan coba lagi.");
  if (rlAllowed === false) {
    throw new Error("Terlalu banyak permintaan trial. Coba lagi besok.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .eq("role", "owner")
    .maybeSingle();

  if (membershipError) throw new Error("Gagal memeriksa pemilik organisasi.");
  if (!membership) throw new Error("Hanya pemilik organisasi yang dapat memulai trial.");

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

  if (error) throw new Error(`Gagal memulai trial: ${error.message}`);

  const result = data as {
    request_id: string | null;
    auto_rejected: boolean;
    rejection_code: string | null;
    already_active: boolean;
  };
  if (!result.auto_rejected) {
    revalidatePath("/dashboard");
    revalidatePath("/trial");
    if (!result.already_active) {
      // Notification failures must not turn a committed activation into an error.
      try {
        await createAdminNotification(supabase, {
          audience: "organization",
          organizationId: membership.organization_id,
          type: "trial_activated",
          title: "Trial 14 hari Anda telah aktif!",
          body: "Akses fitur Starter kini tersedia. Pasangkan kiosk Anda untuk mulai menggunakan POSKART.",
          href: "/devices",
        });
      } catch (notificationError) {
        console.error("Trial activation notification failed", notificationError);
      }
    }
  }

  return {
    requestId: result.request_id,
    autoRejected: result.auto_rejected,
    rejectionCode: result.rejection_code,
    alreadyActive: result.already_active,
  };
}

export async function getMyTrialEligibility(): Promise<TrialEligibility> {
  const { supabase, user } = await getAdminContext();
  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .eq("role", "owner")
    .maybeSingle();
  if (membershipError) throw new Error("Gagal memeriksa pemilik organisasi.");
  if (!membership) {
    return { checkedAt: new Date().toISOString(), eligible: false, reason: "not_owner", claimStatus: null, endsAt: null, revokeReason: null };
  }
  const { data, error } = await supabase.rpc("get_trial_eligibility", {
    p_organization_id: membership.organization_id,
  });
  if (error || !data) throw new Error("Gagal memeriksa jatah trial.");
  return {
    checkedAt: data.checked_at,
    eligible: data.eligible === true,
    reason: data.reason,
    claimStatus: data.claim_status,
    endsAt: data.ends_at,
    revokeReason: data.revoke_reason,
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
        requester:profiles!requester_profile_id(email),
        claims:trial_claims(status, ends_at, revoke_reason, started_at)`,
    )
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Gagal memuat trial request: ${error.message}`);
  if (!data) return null;

  return mapTrialRequest(data as unknown as TrialRequestRow);
}
