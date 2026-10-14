"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext, getAdminMembership, verifyRole } from "@/server/admin/context";

export type GalleryUnboxingStyle = "packaging" | "envelope";

export async function getGalleryExperience() {
  const { supabase } = await getAdminContext();
  const membership = await getAdminMembership();
  if (!membership) throw new Error("No organization associated");
  const fullQuery = await supabase.from("organizations")
    .select("gallery_unboxing_enabled,gallery_unboxing_style")
    .eq("id", membership.organizationId).single();

  // Keep the gallery settings dialog usable while an older deployment is
  // waiting for the new migration to reach Supabase.
  if (fullQuery.error) {
    const legacyQuery = await supabase.from("organizations")
      .select("gallery_unboxing_enabled")
      .eq("id", membership.organizationId).single();
    if (legacyQuery.error) throw new Error("Experience galeri belum dapat dimuat.");
    return {
      unboxingEnabled: legacyQuery.data.gallery_unboxing_enabled !== false,
      unboxingStyle: "packaging" as const,
      canEdit: membership.role === "owner" || membership.role === "admin",
    };
  }

  return {
    unboxingEnabled: fullQuery.data.gallery_unboxing_enabled !== false,
    unboxingStyle: fullQuery.data.gallery_unboxing_style === "envelope" ? "envelope" as const : "packaging" as const,
    canEdit: membership.role === "owner" || membership.role === "admin",
  };
}

export async function updateGalleryExperience(
  input: boolean | { enabled: boolean; style: GalleryUnboxingStyle },
) {
  const { supabase, organizationId } = await verifyRole(["owner", "admin"]);
  const enabled = typeof input === "boolean" ? input : input.enabled;
  const style = typeof input === "boolean" ? "packaging" : input.style;
  if (typeof enabled !== "boolean" || !["packaging", "envelope"].includes(style)) {
    throw new Error("Pilihan unboxing tidak valid.");
  }
  const fullQuery = await supabase.from("organizations")
    .update({ gallery_unboxing_enabled: enabled, gallery_unboxing_style: style, updated_at: new Date().toISOString() })
    .eq("id", organizationId).select("gallery_unboxing_enabled,gallery_unboxing_style").single();

  if (fullQuery.error) {
    const legacyQuery = await supabase.from("organizations")
      .update({ gallery_unboxing_enabled: enabled, updated_at: new Date().toISOString() })
      .eq("id", organizationId).select("gallery_unboxing_enabled").single();
    if (legacyQuery.error) throw new Error("Experience galeri belum dapat disimpan.");
    revalidatePath("/gallery");
    return { unboxingEnabled: legacyQuery.data.gallery_unboxing_enabled !== false, unboxingStyle: "packaging" as const, canEdit: true };
  }

  revalidatePath("/gallery");
  return {
    unboxingEnabled: fullQuery.data.gallery_unboxing_enabled !== false,
    unboxingStyle: fullQuery.data.gallery_unboxing_style === "envelope" ? "envelope" as const : "packaging" as const,
    canEdit: true,
  };
}
