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
