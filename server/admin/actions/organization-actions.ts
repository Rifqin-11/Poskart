"use server";

import { getAdminContext } from "@/server/admin/context";
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
} from "@/lib/organization-features";

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

  const { error: orgErr } = await supabase.from("organizations").insert({
    id: orgId,
    name: values.name,
    status: values.status,
    renewal_date: values.renewalDate,
    features: normalizeOrganizationFeatures(
      values.features ?? DEFAULT_ORGANIZATION_FEATURES,
    ),
    payment_collection_mode: values.paymentCollectionMode ?? "platform",
    updated_at: new Date().toISOString(),
  });
  if (orgErr)
    throw new Error(`Unable to create organization: ${orgErr.message}`);

  const { error: subErr } = await supabase.from("subscriptions").insert({
    organization_id: orgId,
    plan_id: values.planId || "free",
    status: values.subscriptionStatus || "free",
    current_period_end: values.subscriptionExpiresAt || null,
    device_limit: values.deviceLimit ?? 1,
  });
  if (subErr)
    throw new Error(`Unable to create subscription: ${subErr.message}`);
}

export async function updateOrganization(
  id: string,
  patch: Partial<TenantInput>,
): Promise<void> {
  const { supabase } = await getAdminContext();
  const dbPatch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.renewalDate !== undefined) dbPatch.renewal_date = patch.renewalDate;
  if (patch.features !== undefined) {
    dbPatch.features = normalizeOrganizationFeatures(patch.features);
  }
  if (patch.paymentCollectionMode !== undefined) {
    dbPatch.payment_collection_mode = patch.paymentCollectionMode;
  }

  if (Object.keys(dbPatch).length > 1) {
    const { error } = await supabase
      .from("organizations")
      .update(dbPatch)
      .eq("id", id);
    if (error)
      throw new Error(`Unable to update organization: ${error.message}`);
  }

  // Update subscription separately
  if (
    patch.planId !== undefined ||
    patch.subscriptionStatus !== undefined ||
    patch.subscriptionExpiresAt !== undefined ||
    patch.deviceLimit !== undefined
  ) {
    const subPatch: Record<string, unknown> = {};
    if (patch.planId !== undefined) subPatch.plan_id = patch.planId;
    if (patch.subscriptionStatus !== undefined)
      subPatch.status = patch.subscriptionStatus;
    if (patch.subscriptionExpiresAt !== undefined)
      subPatch.current_period_end = patch.subscriptionExpiresAt;
    if (patch.deviceLimit !== undefined)
      subPatch.device_limit = Math.max(1, patch.deviceLimit);

    if (Object.keys(subPatch).length > 0) {
      const { error } = await supabase
        .from("subscriptions")
        .update(subPatch)
        .eq("organization_id", id);
      if (error) {
        await supabase.from("subscriptions").upsert({
          organization_id: id,
          plan_id: patch.planId || "free",
          status: patch.subscriptionStatus || "free",
          current_period_end: patch.subscriptionExpiresAt || null,
          device_limit: patch.deviceLimit ?? 1,
        });
      }
    }
  }
}

export async function deleteOrganization(id: string): Promise<void> {
  const { supabase } = await getAdminContext();
  const { error } = await supabase.from("organizations").delete().eq("id", id);
  if (error) throw new Error(`Unable to delete organization: ${error.message}`);
}

export async function getMyOrganizationDetails() {
  const { supabase, user } = await getAdminContext();

  const { data: profile, error: pErr } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .limit(1)
    .single();
  if (pErr || !profile?.organization_id)
    throw new Error("No organization associated");

  const { data: organization, error: tErr } = await supabase
    .from("organizations")
    .select(
      `
      *,
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
    .eq("id", profile.organization_id)
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
    subscription_status: sub?.status ?? "free",
    subscription_expires_at: sub?.current_period_end ?? null,
    device_limit: sub?.device_limit ?? planMeta?.included_devices ?? 1,
    subscription_is_active: subscriptionIsActive,
  };
}

export async function updateMyOrganizationName(name: string) {
  const { supabase, user } = await getAdminContext();

  const { data: profile } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .limit(1)
    .single();
  if (!profile?.organization_id) throw new Error("No organization associated");

  const { data, error } = await supabase
    .from("organizations")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", profile.organization_id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getMyOrganizationMembers() {
  const { supabase, user } = await getAdminContext();

  const { data: profile } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .limit(1)
    .single();
  if (!profile?.organization_id) throw new Error("No organization associated");

  const { data, error } = await supabase
    .from("organization_members")
    .select(
      "id, role, created_at, profile_id, profiles(id, email, role, created_at)",
    )
    .eq("organization_id", profile.organization_id)
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

export async function getMyOrganizationInvitations() {
  const { supabase, user } = await getAdminContext();

  const { data: profile } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .limit(1)
    .single();
  if (!profile?.organization_id) throw new Error("No organization associated");

  const { data, error } = await supabase
    .from("organization_invitations")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function inviteUserToTenant(email: string) {
  const { supabase, user } = await getAdminContext();

  const { data: profile } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .limit(1)
    .single();
  if (!profile?.organization_id) throw new Error("No organization associated");

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
        role: "staff",
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
  const { supabase } = await getAdminContext();
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
    .select("organization_id")
    .eq("profile_id", user.id)
    .limit(1)
    .single();
  if (!currentMembership?.organization_id) {
    throw new Error("No organization associated");
  }

  const { data: member, error: memberErr } = await supabase
    .from("organization_members")
    .select("id, profile_id, organization_id")
    .eq("id", memberId)
    .eq("organization_id", currentMembership.organization_id)
    .maybeSingle();
  if (memberErr) throw memberErr;
  if (!member) throw new Error("Member not found");

  if (member.profile_id === user.id) {
    throw new Error("You cannot remove yourself from your own organization");
  }

  const { error: deleteErr } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", member.id);
  if (deleteErr) throw deleteErr;
  return true;
}
