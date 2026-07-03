"use server";

import { getAdminContext } from "@/server/admin/context";
import { createAdminNotification } from "@/server/admin/notifications";

export async function acceptJoinRequestAction(requestId: string) {
  const { supabase, user } = await getAdminContext();

  // Get current user's membership to verify role
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
    throw new Error("Hanya pemilik atau admin yang dapat menyetujui permintaan bergabung.");
  }

  // Get join request details
  const { data: request, error: reqErr } = await supabase
    .from("organization_join_requests")
    .select("id, organization_id, profile_id, status")
    .eq("id", requestId)
    .eq("organization_id", currentMembership.organization_id)
    .maybeSingle();

  if (reqErr) throw reqErr;
  if (!request) throw new Error("Permintaan tidak ditemukan");

  if (request.status !== "pending") {
    throw new Error("Permintaan sudah diproses");
  }

  // Add member to organization
  const { error: insertErr } = await supabase
    .from("organization_members")
    .insert({
      organization_id: request.organization_id,
      profile_id: request.profile_id,
      role: "partner",
    });

  if (insertErr) throw insertErr;

  // Update join request status to approved
  const { error: updateErr } = await supabase
    .from("organization_join_requests")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", requestId);

  if (updateErr) throw updateErr;

  // Get organization name to make notification friendly
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", request.organization_id)
    .maybeSingle();

  // Notify the applicant
  await createAdminNotification(supabase, {
    audience: "user",
    recipientProfileId: request.profile_id,
    type: "join_request_approved",
    title: "Permintaan Bergabung Disetujui",
    body: `Permintaan Anda untuk bergabung dengan ${org?.name ?? "organisasi"} telah disetujui.`,
    href: "/dashboard",
  });

  return true;
}

export async function rejectJoinRequestAction(requestId: string) {
  const { supabase, user } = await getAdminContext();

  // Get current user's membership to verify role
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
    throw new Error("Hanya pemilik atau admin yang dapat menolak permintaan bergabung.");
  }

  // Get join request details
  const { data: request, error: reqErr } = await supabase
    .from("organization_join_requests")
    .select("id, organization_id, profile_id, status")
    .eq("id", requestId)
    .eq("organization_id", currentMembership.organization_id)
    .maybeSingle();

  if (reqErr) throw reqErr;
  if (!request) throw new Error("Permintaan tidak ditemukan");

  if (request.status !== "pending") {
    throw new Error("Permintaan sudah diproses");
  }

  // Update join request status to rejected
  const { error: updateErr } = await supabase
    .from("organization_join_requests")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", requestId);

  if (updateErr) throw updateErr;

  // Get organization name
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", request.organization_id)
    .maybeSingle();

  // Notify the applicant
  await createAdminNotification(supabase, {
    audience: "user",
    recipientProfileId: request.profile_id,
    type: "join_request_rejected",
    title: "Permintaan Bergabung Ditolak",
    body: `Permintaan Anda untuk bergabung dengan ${org?.name ?? "organisasi"} ditolak.`,
  });

  return true;
}

export async function cancelJoinRequestAction(requestId: string) {
  const { supabase, user } = await getAdminContext();

  // Verify the request belongs to current user
  const { data: request, error: reqErr } = await supabase
    .from("organization_join_requests")
    .select("id, profile_id")
    .eq("id", requestId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (reqErr) throw reqErr;
  if (!request) throw new Error("Permintaan tidak ditemukan");

  const { error: deleteErr } = await supabase
    .from("organization_join_requests")
    .delete()
    .eq("id", requestId);

  if (deleteErr) throw deleteErr;

  return true;
}

export async function getPendingJoinRequestsAction() {
  const { supabase, user } = await getAdminContext();

  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("profile_id", user.id)
    .limit(1)
    .single();

  if (!member?.organization_id) {
    return [];
  }

  const { data, error } = await supabase
    .from("organization_join_requests")
    .select(`
      id,
      created_at,
      profile:profiles (
        id,
        email
      )
    `)
    .eq("organization_id", member.organization_id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as unknown as Array<{
    id: string;
    created_at: string;
    profile: {
      id: string;
      email: string;
    };
  }>;
}
