"use server";

import {
  DEFAULT_GALLERY_BRANDING,
  normalizeGalleryBranding,
  normalizeGalleryBrandingOverrides,
  type GalleryBrandingOverrides,
} from "@/lib/gallery/branding";
import {
  getAdminContext,
  getAdminMembership,
  verifyRole,
} from "@/server/admin/context";

export async function getGalleryBranding() {
  const { supabase } = await getAdminContext();
  const membership = await getAdminMembership();
  if (!membership) throw new Error("No organization associated");
  const { data, error } = await supabase
    .from("organizations")
    .select("gallery_branding")
    .eq("id", membership.organizationId)
    .maybeSingle();

  if (error) throw new Error("Branding gallery belum dapat dimuat.");
  return normalizeGalleryBranding(data?.gallery_branding);
}

export async function updateGalleryBranding(
  branding: GalleryBrandingOverrides,
) {
  const { supabase, organizationId } = await verifyRole(["owner", "admin"]);
  const normalized = normalizeGalleryBrandingOverrides(branding);
  const { error } = await supabase
    .from("organizations")
    .update({
      gallery_branding: normalized,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId);

  if (error) throw new Error("Branding gallery belum dapat disimpan.");
  return normalizeGalleryBranding({ ...DEFAULT_GALLERY_BRANDING, ...normalized });
}
