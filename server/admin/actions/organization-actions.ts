"use server";

import {
  getAdminContext,
  getAdminMembership,
} from "@/server/admin/context";
import { cache } from "react";
import {
  subscriptionPlanMeta,
  subscriptionDisplayName,
  isSubscriptionActive,
  type Organization,
  type OrganizationRow,
  type TenantInput,
  type OrganizationMemberWithProfile,
} from "../_shared/admin-types";
import {
  DEFAULT_ORGANIZATION_FEATURES,
  normalizeOrganizationFeatures,
  type OrganizationFeatureAccess,
} from "@/lib/organization-features";
import {
  parseJakartaDateInputEnd,
  parseJakartaDateTimeInput,
} from "@/lib/jakarta-time";
import { getServiceRoleClient } from "@/lib/supabase/server";
import {
  getOrganizationDuitkuGatewaySummary,
  saveOrganizationDuitkuGateway,
  type SaveOrganizationDuitkuGatewayInput,
} from "@/server/payments/organization-gateway";
import { revalidatePath } from "next/cache";

function normalizeSubscriptionExpiry(value?: string | null) {
  if (!value) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? parseJakartaDateInputEnd(value)
    : parseJakartaDateTimeInput(value);
  if (!date || Number.isNaN(date.getTime())) {
    throw new Error("Subscription expiry date is invalid.");
  }
  return date.toISOString();
}

function validateSubscriptionInput(values: {
  planId?: string | null;
  subscriptionStatus?: string | null;
  subscriptionExpiresAt?: string | null;
}) {
  const planId = values.planId || "free";
  const status = values.subscriptionStatus || "free";
  const expiry = normalizeSubscriptionExpiry(values.subscriptionExpiresAt);

  if (planId === "free") {
    if (status !== "free") {
      throw new Error("Free Account must use Free subscription status.");
    }
    return { planId, status, expiry: null };
  }

  if (!["active", "trialing", "past_due", "canceled"].includes(status)) {
    throw new Error("Paid plans must use a valid subscription status.");
  }

  if (status === "active" || status === "trialing") {
    if (!expiry || new Date(expiry).getTime() <= Date.now()) {
      throw new Error(
        "Active or trialing subscriptions require a future expiry date.",
      );
    }
  }

  return { planId, status, expiry };
}

async function saveOrganizationWithSubscription(
  supabase: Awaited<ReturnType<typeof getAdminContext>>["supabase"],
  organizationId: string,
  organization: {
    name: string;
    status: Organization["status"];
    renewalDate: string;
    features: Organization["features"];
    paymentCollectionMode: Organization["paymentCollectionMode"];
  },
  subscription: {
    planId: string;
    status: string;
    expiry: string | null;
    deviceLimit: number;
  },
) {
  const { error } = await supabase.rpc("admin_save_organization", {
    p_organization_id: organizationId,
    p_organization: {
      name: organization.name,
      status: organization.status,
      renewal_date: organization.renewalDate,
      features: normalizeOrganizationFeatures(organization.features),
      payment_collection_mode: organization.paymentCollectionMode ?? "platform",
    },
    p_subscription: {
      plan_id: subscription.planId,
      status: subscription.status,
      current_period_end: subscription.expiry,
      device_limit: subscription.deviceLimit,
    },
  });

  if (error) throw new Error(`Unable to save organization: ${error.message}`);
}

export async function getOrganizations(): Promise<Organization[]> {
  const { supabase } = await getAdminContext();
  const { data, error } = await supabase
    .from("organizations")
    .select(
      `
      id,
      name,
      status,
      renewal_date,
      features,
      payment_collection_mode,
      devices:devices(count),
      organization_members:organization_members(count),
      subscriptions (
        plan_id,
        status,
        device_limit,
        current_period_end,
        subscription_plans (
          name,
          duration_months,
          base_price,
          included_devices,
          additional_device_price_monthly
        )
      )
    `,
    )
    .order("name", { ascending: true });

  if (error) throw new Error(`Unable to load organizations: ${error.message}`);

  return ((data ?? []) as OrganizationRow[]).map((row) => {
    const sub = Array.isArray(row.subscriptions)
      ? row.subscriptions[0]
      : row.subscriptions;
    const planMeta = subscriptionPlanMeta(sub);
    const planId = sub?.plan_id || "free";
    const subStatus = sub?.status || "free";
    const expiresAt = sub?.current_period_end || null;
    const deviceLimit = sub?.device_limit ?? planMeta?.included_devices ?? 1;
    const planName = subscriptionDisplayName(sub);

    // Get count value from counts response structure
    const devicesCount = row.devices?.[0]?.count ?? 0;
    const usersCount = row.organization_members?.[0]?.count ?? 0;

    return {
      id: row.id,
      name: row.name,
      status: row.status,
      devices: devicesCount,
      users: usersCount,
      renewalDate: row.renewal_date,
      features: normalizeOrganizationFeatures(row.features),
      paymentCollectionMode: row.payment_collection_mode ?? "platform",
      planId: planId,
      subscriptionStatus: subStatus,
      subscriptionExpiresAt: expiresAt,
      deviceLimit,
      plan: planName,
    };
  });
}

export async function createOrganization(values: TenantInput): Promise<void> {
  const { supabase } = await getAdminContext();
  const orgId = `org_${Date.now()}`;
  const subscription = validateSubscriptionInput(values);

  await saveOrganizationWithSubscription(supabase, orgId, {
    name: values.name,
    status: values.status,
    renewalDate: values.renewalDate,
    features: values.features ?? DEFAULT_ORGANIZATION_FEATURES,
    paymentCollectionMode: values.paymentCollectionMode ?? "platform",
  }, {
    planId: subscription.planId,
    status: subscription.status,
    expiry: subscription.expiry,
    deviceLimit: values.deviceLimit ?? 1,
  });
}

export async function updateOrganization(
  id: string,
  patch: Partial<TenantInput>,
): Promise<void> {
  const { supabase } = await getAdminContext();
  const [{ data: currentOrganization, error: organizationError }, {
    data: currentSubscription,
    error: subscriptionError,
  }] = await Promise.all([
    supabase
      .from("organizations")
      .select("name, status, renewal_date, features, payment_collection_mode")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("plan_id, status, current_period_end, device_limit")
      .eq("organization_id", id)
      .maybeSingle(),
  ]);

  if (organizationError) {
    throw new Error(`Unable to load organization: ${organizationError.message}`);
  }
  if (subscriptionError) {
    throw new Error(
      `Unable to load current subscription: ${subscriptionError.message}`,
    );
  }
  if (!currentOrganization) {
    throw new Error("Organization not found.");
  }

  const nextSubscription = validateSubscriptionInput({
    planId: patch.planId ?? currentSubscription?.plan_id,
    subscriptionStatus: patch.subscriptionStatus ?? currentSubscription?.status,
    subscriptionExpiresAt:
      patch.subscriptionExpiresAt !== undefined
        ? patch.subscriptionExpiresAt
        : currentSubscription?.current_period_end,
  });

  await saveOrganizationWithSubscription(supabase, id, {
    name: patch.name ?? currentOrganization.name,
    status: patch.status ?? currentOrganization.status,
    renewalDate:
      patch.renewalDate ?? currentOrganization.renewal_date,
    features: patch.features ?? currentOrganization.features,
    paymentCollectionMode:
      patch.paymentCollectionMode ??
      currentOrganization.payment_collection_mode ??
      "platform",
  }, {
    planId: nextSubscription.planId,
    status: nextSubscription.status,
    expiry: nextSubscription.expiry,
    deviceLimit: Math.max(
      1,
      patch.deviceLimit ?? currentSubscription?.device_limit ?? 1,
    ),
  });

  revalidatePath("/superadmin");
  revalidatePath("/settings");
}

export async function deleteOrganization(id: string): Promise<void> {
  const { supabase } = await getAdminContext();
  const { error } = await supabase.from("organizations").delete().eq("id", id);
  if (error) {
    throw new Error(
      "Organization could not be deleted. Remove related data first, then try again.",
    );
  }
}

export async function deleteMyOrganization(confirmation: string) {
  const { supabase } = await getAdminContext();
  const membership = await getAdminMembership();

  if (!membership || membership.role !== "owner") {
    throw new Error("Hanya pemilik workspace yang dapat menghapus workspace.");
  }

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", membership.organizationId)
    .single();

  if (organizationError || !organization) {
    throw new Error("Workspace tidak ditemukan.");
  }

  const expectedConfirmation = `delete ${organization.name}`;
  if (confirmation !== expectedConfirmation) {
    throw new Error(`Ketikkan \"${expectedConfirmation}\" untuk mengonfirmasi.`);
  }

  const { error: deleteError } = await supabase
    .from("organizations")
    .delete()
    .eq("id", organization.id);

  if (deleteError) {
    throw new Error(
      "Workspace tidak dapat dihapus. Hapus data terkait terlebih dahulu, lalu coba lagi.",
    );
  }

  revalidatePath("/");
  revalidatePath("/onboarding");
  return true;
}

const getCachedMyOrganizationDetails = cache(async () => {
  const { supabase } = await getAdminContext();
  const membership = await getAdminMembership();
  if (!membership) throw new Error("No organization associated");

  const { data: organization, error: tErr } = await supabase
    .from("organizations")
    .select(
      `
      id,
      name,
      status,
      renewal_date,
      join_code,
      features,
      payment_collection_mode,
      qris_payment_method,
      created_at,
      updated_at,
      subscriptions (
        plan_id,
        status,
        current_period_end,
        device_limit,
        subscription_plans (
          name,
          duration_months,
          base_price,
          included_devices,
          additional_device_price_monthly
        )
      )
    `,
    )
    .eq("id", membership.organizationId)
    .single();
  if (tErr) throw tErr;
  const sub = Array.isArray(organization.subscriptions)
    ? organization.subscriptions[0]
    : organization.subscriptions;
  const planMeta = subscriptionPlanMeta(sub);
  const subscriptionIsActive = isSubscriptionActive(sub);

  return {
    ...organization,
    plan_id: sub?.plan_id ?? "free",
    plan_name: subscriptionDisplayName(sub),
    join_code: organization.join_code ?? null,
    features: normalizeOrganizationFeatures(organization.features),
    payment_collection_mode:
      organization.payment_collection_mode ?? "platform",
    qris_payment_method:
      organization.qris_payment_method === "SP" ? "SP" : "SQ",
    subscription_status: sub?.status ?? "free",
    subscription_expires_at: sub?.current_period_end ?? null,
    device_limit: sub?.device_limit ?? planMeta?.included_devices ?? 1,
    subscription_is_active: subscriptionIsActive,
  };
});

export async function getMyOrganizationDetails() {
  return getCachedMyOrganizationDetails();
}

export async function updateMyOrganizationFeatures(
  features: OrganizationFeatureAccess,
) {
  const { supabase, user } = await getAdminContext();
  const membership = await getMyManageableOrganizationMembership(
    supabase,
    user.id,
  );
  const nextFeatures = normalizeOrganizationFeatures(features);

  const { data, error } = await supabase
    .from("organizations")
    .update({ features: nextFeatures, updated_at: new Date().toISOString() })
    .eq("id", membership.organization_id)
    .select("id,features")
    .single();

  if (error) throw error;
  return normalizeOrganizationFeatures(data.features);
}

export async function updateMyOrganizationName(name: string) {
  const { supabase, user } = await getAdminContext();

  const { data: profile } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("profile_id", user.id)
    .limit(1)
    .single();
  if (!profile?.organization_id) throw new Error("No organization associated");

  if (profile.role !== "owner" && profile.role !== "admin") {
    throw new Error("Hanya pemilik atau admin yang dapat mengubah nama organisasi.");
  }

  const { data, error } = await supabase
    .from("organizations")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", profile.organization_id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMyPaymentCollectionMode(
  mode: "platform" | "custom",
) {
  const { supabase, user } = await getAdminContext();

  const { data: profile } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("profile_id", user.id)
    .limit(1)
    .single();
  if (!profile?.organization_id) throw new Error("No organization associated");

  if (profile.role !== "owner" && profile.role !== "admin") {
    throw new Error(
      "Hanya pemilik atau admin yang dapat mengubah mode pembayaran organisasi.",
    );
  }

  const { data, error } = await supabase
    .from("organizations")
    .update({
      payment_collection_mode: mode,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.organization_id)
    .select("id,payment_collection_mode")
    .single();
  if (error) throw error;
  return data;
}

export async function updateMyQrisPaymentMethod(method: "SQ" | "SP") {
  const { supabase, user } = await getAdminContext();

  const { data: profile } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("profile_id", user.id)
    .limit(1)
    .single();
  if (!profile?.organization_id) throw new Error("No organization associated");

  if (profile.role !== "owner" && profile.role !== "admin") {
    throw new Error(
      "Hanya pemilik atau admin yang dapat mengubah metode QRIS organisasi.",
    );
  }

  const { data, error } = await supabase
    .from("organizations")
    .update({
      qris_payment_method: method,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.organization_id)
    .select("id,qris_payment_method")
    .single();
  if (error) throw error;
  return data;
}

export async function getMyPaymentGatewaySettings() {
  const { supabase, user } = await getAdminContext();
  const membership = await getMyManageableOrganizationMembership(supabase, user.id);
  const serviceRoleClient = await getServiceRoleClient();
  return getOrganizationDuitkuGatewaySummary(
    serviceRoleClient,
    membership.organization_id,
  );
}

export async function saveMyPaymentGatewaySettings(
  input: SaveOrganizationDuitkuGatewayInput,
) {
  const { supabase, user } = await getAdminContext();
  const membership = await getMyManageableOrganizationMembership(supabase, user.id);
  const serviceRoleClient = await getServiceRoleClient();
  await saveOrganizationDuitkuGateway(
    serviceRoleClient,
    membership.organization_id,
    input,
    user.id,
  );
  return getOrganizationDuitkuGatewaySummary(
    serviceRoleClient,
    membership.organization_id,
  );
}

export async function getMyOrganizationMembers() {
  const { supabase } = await getAdminContext();
  const membership = await getAdminMembership();
  if (!membership) throw new Error("No organization associated");

  const { data, error } = await supabase
    .from("organization_members")
    .select(
      "id, role, created_at, profile_id, profiles(id, email, role, created_at)",
    )
    .eq("organization_id", membership.organizationId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return ((data ?? []) as OrganizationMemberWithProfile[]).map((member) => {
    const memberProfile = Array.isArray(member.profiles)
      ? member.profiles[0]
      : member.profiles;

    return {
      id: member.id,
      email: memberProfile?.email ?? "Unknown user",
      role: member.role,
      created_at: member.created_at,
      profile_id: member.profile_id,
    };
  });
}

async function getMyManageableOrganizationMembership(
  supabase: Awaited<ReturnType<typeof getAdminContext>>["supabase"],
  userId: string,
) {
  const { data: profile, error } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("profile_id", userId)
    .limit(1)
    .single();

  if (error || !profile?.organization_id) {
    throw new Error("No organization associated");
  }
  if (profile.role !== "owner" && profile.role !== "admin") {
    throw new Error(
      "Hanya pemilik atau admin yang dapat mengatur payment gateway private.",
    );
  }

  return profile;
}

export async function getMyOrganizationInvitations() {
  const { supabase } = await getAdminContext();
  const membership = await getAdminMembership();
  if (!membership) throw new Error("No organization associated");

  const { data, error } = await supabase
    .from("organization_invitations")
    .select("id,email,created_at")
    .eq("organization_id", membership.organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function inviteUserToTenant(email: string) {
  const { supabase, user } = await getAdminContext();

  const { data: profile } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("profile_id", user.id)
    .limit(1)
    .single();
  if (!profile?.organization_id) throw new Error("No organization associated");

  if (profile.role !== "owner" && profile.role !== "admin") {
    throw new Error("Hanya pemilik atau admin yang dapat mengundang anggota.");
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    const { data: existingMember } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", profile.organization_id)
      .eq("profile_id", existingProfile.id)
      .maybeSingle();

    if (existingMember) {
      throw new Error("User is already a member of this organization");
    }

    const { error: memberErr } = await supabase
      .from("organization_members")
      .insert({
        organization_id: profile.organization_id,
        profile_id: existingProfile.id,
        role: "partner",
      });
    if (memberErr) throw memberErr;
    return { status: "joined" };
  }

  const { data: existingInvitation } = await supabase
    .from("organization_invitations")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .eq("email", email)
    .maybeSingle();

  if (existingInvitation) {
    throw new Error("Invitation already exists for this email");
  }

  const { data, error } = await supabase
    .from("organization_invitations")
    .insert({
      email: email,
      organization_id: profile.organization_id,
      invited_by: user.email ?? "Admin",
    })
    .select()
    .single();
  if (error) throw error;
  return { status: "invited", data };
}

export async function deleteTenantInvitation(id: string) {
  const { supabase, user } = await getAdminContext();

  const { data: profile } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("profile_id", user.id)
    .limit(1)
    .single();
  if (!profile?.organization_id) throw new Error("No organization associated");

  if (profile.role !== "owner" && profile.role !== "admin") {
    throw new Error("Hanya pemilik atau admin yang dapat membatalkan undangan.");
  }

  const { error } = await supabase
    .from("organization_invitations")
    .delete()
    .eq("id", id);
  if (error) throw error;
  return true;
}

export async function removeMemberFromTenant(memberId: string) {
  const { supabase, user } = await getAdminContext();

  const { data: currentMembership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("profile_id", user.id)
    .limit(1)
    .single();
  if (!currentMembership?.organization_id) {
    throw new Error("No organization associated");
  }

  if (currentMembership.role !== "owner" && currentMembership.role !== "admin") {
    throw new Error("Hanya pemilik atau admin yang dapat menghapus anggota.");
  }

  const { data: member, error: memberErr } = await supabase
    .from("organization_members")
    .select("id, profile_id, organization_id, role")
    .eq("id", memberId)
    .eq("organization_id", currentMembership.organization_id)
    .maybeSingle();
  if (memberErr) throw memberErr;
  if (!member) throw new Error("Member not found");

  if (member.profile_id === user.id) {
    throw new Error("You cannot remove yourself from your own organization");
  }

  if (currentMembership.role === "admin" && (member.role === "owner" || member.role === "admin")) {
    throw new Error("Admin tidak dapat menghapus pemilik atau sesama admin.");
  }

  const { error: deleteErr } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", member.id);
  if (deleteErr) throw deleteErr;
  return true;
}

export async function leaveMyOrganization() {
  const { supabase, user } = await getAdminContext();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("profile_id", user.id)
    .limit(1)
    .single();
  if (!membership?.organization_id) {
    throw new Error("Tidak ada organisasi terkait.");
  }

  if (membership.role === "owner") {
    const { count, error: countErr } = await supabase
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", membership.organization_id)
      .eq("role", "owner");
    if (countErr) throw countErr;

    if (count !== null && count <= 1) {
      throw new Error("Anda adalah satu-satunya pemilik. Harap pindahkan kepemilikan atau hapus workspace terlebih dahulu.");
    }
  }

  const { error: deleteErr } = await supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", membership.organization_id)
    .eq("profile_id", user.id);
  if (deleteErr) throw deleteErr;

  return true;
}

export async function transferMyOrganizationOwnership(targetMemberProfileId: string) {
  const { supabase, user } = await getAdminContext();

  const { data: currentMembership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("profile_id", user.id)
    .limit(1)
    .single();
  if (!currentMembership?.organization_id || currentMembership.role !== "owner") {
    throw new Error("Hanya pemilik organisasi yang dapat memindahkan kepemilikan.");
  }

  const { data: targetMembership, error: targetErr } = await supabase
    .from("organization_members")
    .select("id, role")
    .eq("organization_id", currentMembership.organization_id)
    .eq("profile_id", targetMemberProfileId)
    .maybeSingle();
  if (targetErr) throw targetErr;
  if (!targetMembership) {
    throw new Error("Target anggota tidak ditemukan di organisasi ini.");
  }

  if (targetMemberProfileId === user.id) {
    throw new Error("Anda sudah menjadi pemilik organisasi ini.");
  }

  // Update target user to owner
  const { error: updateTargetErr } = await supabase
    .from("organization_members")
    .update({ role: "owner", updated_at: new Date().toISOString() })
    .eq("id", targetMembership.id);
  if (updateTargetErr) throw updateTargetErr;

  // Downgrade current user to admin
  const { error: updateCurrentErr } = await supabase
    .from("organization_members")
    .update({ role: "admin", updated_at: new Date().toISOString() })
    .eq("organization_id", currentMembership.organization_id)
    .eq("profile_id", user.id);
  if (updateCurrentErr) throw updateCurrentErr;

  return true;
}

export async function updateMemberRole(memberId: string, newRole: string) {
  const { supabase, user } = await getAdminContext();

  // Validate current user role (must be owner)
  const { data: currentMembership, error: currentMembershipErr } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("profile_id", user.id)
    .limit(1)
    .single();

  if (currentMembershipErr || !currentMembership || currentMembership.role !== "owner") {
    throw new Error("Hanya pemilik organisasi (owner) yang dapat mengubah role anggota.");
  }

  // Get target member
  const { data: targetMember, error: targetMemberErr } = await supabase
    .from("organization_members")
    .select("id, profile_id, organization_id, role")
    .eq("id", memberId)
    .limit(1)
    .single();

  if (targetMemberErr || !targetMember) {
    throw new Error("Anggota tidak ditemukan.");
  }

  if (targetMember.organization_id !== currentMembership.organization_id) {
    throw new Error("Anggota tidak berada di dalam organisasi Anda.");
  }

  // Prevent user from changing their own role
  if (targetMember.profile_id === user.id) {
    throw new Error("Anda tidak dapat mengubah role Anda sendiri.");
  }

  // Cannot change role to owner via this action (must use transfer ownership)
  if (newRole === "owner") {
    throw new Error("Gunakan fitur Transfer Kepemilikan untuk mengubah role menjadi owner.");
  }

  // Update target member's role
  const { error: updateErr } = await supabase
    .from("organization_members")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("id", memberId);

  if (updateErr) throw updateErr;

  return true;
}
