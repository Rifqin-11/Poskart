"use server";

import { redirect } from "next/navigation";
import { getAdminContext } from "@/server/admin/context";
import { getServiceRoleClient } from "@/lib/supabase/server";
import {
  hashOrganizationInvitationToken,
  organizationInvitationPath,
} from "@/server/admin/organization-invitation";

type OrganizationInvitationRecord = {
  id: string;
  email: string;
  organization_id: string;
  status: "pending" | "accepted" | "declined" | "revoked";
  created_at: string;
  expires_at: string;
  organization: { name: string } | { name: string }[] | null;
};

function getOrganizationName(
  organization: OrganizationInvitationRecord["organization"],
) {
  return Array.isArray(organization)
    ? organization[0]?.name ?? "POSKART workspace"
    : organization?.name ?? "POSKART workspace";
}

export async function getOrganizationInvitationByToken(token: string) {
  const normalizedToken = token.trim();
  if (!/^[a-f0-9]{64}$/i.test(normalizedToken)) return null;

  const admin = await getServiceRoleClient();
  const { data, error } = await admin
    .from("organization_invitations")
    .select(
      "id,email,organization_id,status,created_at,expires_at,organization:organizations(name)",
    )
    .eq("token_hash", hashOrganizationInvitationToken(normalizedToken))
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const record = data as unknown as OrganizationInvitationRecord;
  return {
    id: record.id,
    email: record.email,
    organizationId: record.organization_id,
    organizationName: getOrganizationName(record.organization),
    status: record.status,
    createdAt: record.created_at,
    expiresAt: record.expires_at,
    expired: new Date(record.expires_at).getTime() <= Date.now(),
  };
}

function invitationUrl(token: string, params?: Record<string, string>) {
  const path = organizationInvitationPath(token);
  if (!params) return path;
  const query = new URLSearchParams(params).toString();
  return `${path}?${query}`;
}

export async function acceptOrganizationInvitationAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const mode = String(formData.get("mode") ?? "accept");

  if (!token) redirect("/onboarding?error=Invitation+link+is+invalid");

  const { supabase } = await getAdminContext();
  const { error } = await supabase.rpc("accept_organization_invitation", {
    invitation_token_hash: hashOrganizationInvitationToken(token),
    leave_current: mode === "leave",
  });

  if (error) {
    const message = error.message.includes("INVITATION_MEMBERSHIP_CONFLICT")
      ? "You already belong to another workspace. Choose the leave-and-join option to continue."
      : error.message.includes("ownership")
        ? "Transfer ownership or delete your current workspace before joining another one."
        : error.message.includes("different email")
          ? "Sign in with the email address that received this invitation."
          : "This invitation is invalid, expired, or no longer available.";
    redirect(invitationUrl(token, { error: message }));
  }

  redirect("/dashboard");
}

export async function declineOrganizationInvitationAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();

  if (!token) redirect("/onboarding?error=Invitation+link+is+invalid");

  const { supabase } = await getAdminContext();
  const { error } = await supabase.rpc("decline_organization_invitation", {
    invitation_token_hash: hashOrganizationInvitationToken(token),
  });

  if (error) {
    redirect(
      invitationUrl(token, {
        error: error.message.includes("different email")
          ? "Sign in with the email address that received this invitation."
          : "This invitation is invalid, expired, or no longer available.",
      }),
    );
  }

  redirect("/onboarding?success=Invitation+declined");
}
