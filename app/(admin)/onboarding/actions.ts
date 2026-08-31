"use server";

import { encodedRedirect } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

function readField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createOrganizationAction(formData: FormData) {
  const organizationName = readField(formData, "organizationName");

  if (!organizationName) {
    return encodedRedirect(
      "error",
      "/onboarding",
      "Organization name is required.",
    );
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return encodedRedirect("error", "/login", "Sesi Anda telah berakhir. Silakan masuk lagi.");
  }

  let createError: { message: string } | null = null;
  try {
    const result = await supabase.rpc("create_organization_for_current_user", {
      org_name: organizationName,
    });
    createError = result.error;
  } catch {
    createError = { message: "Organization creation failed" };
  }

  if (createError) {
    return encodedRedirect(
      "error",
      "/onboarding",
      "Workspace belum dapat dibuat. Periksa nama workspace lalu coba lagi.",
    );
  }

  return encodedRedirect(
    "success",
    "/dashboard?tutorial=1",
    "Workspace berhasil dibuat. Dashboard sedang disiapkan.",
  );
}

import { cancelJoinRequestAction } from "@/server/admin/actions/join-request-actions";

export async function joinOrganizationAction(formData: FormData) {
  const organizationCode = readField(formData, "organizationCode");

  if (!organizationCode) {
    return encodedRedirect(
      "error",
      "/onboarding",
      "Organization code is required.",
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("join_organization_by_code", {
    org_join_code: organizationCode,
  });

  if (error) {
    return encodedRedirect("error", "/onboarding", error.message);
  }

  return encodedRedirect(
    "success",
    "/onboarding",
    "Join request sent successfully. Waiting for owner or admin approval.",
  );
}

export async function cancelMyPendingRequestAction(formData: FormData) {
  const requestId = readField(formData, "requestId");
  if (!requestId) {
    return encodedRedirect(
      "error",
      "/onboarding",
      "Request ID is required to cancel.",
    );
  }

  try {
    await cancelJoinRequestAction(requestId);
    return encodedRedirect(
      "success",
      "/onboarding",
      "Join request cancelled successfully.",
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan.";
    return encodedRedirect("error", "/onboarding", message);
  }
}
