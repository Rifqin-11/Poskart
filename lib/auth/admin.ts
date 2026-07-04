import type { SupabaseClient } from "@supabase/supabase-js";

export async function isSuperAdminProfile(
  supabase: SupabaseClient,
  userId?: string | null,
) {
  if (!userId) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[superadmin-role-check]", error);
    return false;
  }

  return data?.role === "admin";
}
