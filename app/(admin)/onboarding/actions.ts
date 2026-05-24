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
  const { error } = await supabase.rpc("create_organization_for_current_user", {
    org_name: organizationName,
  });

  if (error) {
    return encodedRedirect("error", "/onboarding", error.message);
  }

  return encodedRedirect(
    "success",
    "/dashboard",
    "Organization created. You can start from the dashboard.",
  );
}

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
    "/dashboard",
    "Organization joined. You can now access your workspace.",
  );
}
