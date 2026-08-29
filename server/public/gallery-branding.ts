import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  normalizeGalleryBranding,
  type GalleryBranding,
} from "@/lib/gallery/branding";

type GallerySessionThemeInput = {
  organization_id?: string | null;
  layout_schema_id?: string | null;
  theme_name?: string | null;
};

export type ResolvedGalleryBranding = {
  themeId: string | null;
  branding: GalleryBranding;
};

/** Resolves the current branding for a session without changing its page data. */
export async function resolveGallerySessionBranding(
  client: SupabaseClient,
  session: GallerySessionThemeInput,
): Promise<ResolvedGalleryBranding> {
  const organizationId = session.organization_id?.trim();
  const layoutSchemaId = session.layout_schema_id?.trim();
  const organizationBranding = organizationId
    ? await readOrganizationBranding(client, organizationId)
    : undefined;

  if (organizationId && layoutSchemaId) {
    const { data } = await client
      .from("layout_schemas")
      .select("id,schema")
      .eq("organization_id", organizationId)
      .eq("id", layoutSchemaId)
      .maybeSingle();

    if (data) {
      return {
        themeId: data.id,
        branding: normalizeGalleryBranding(organizationBranding),
      };
    }
  }

  const themeName = session.theme_name?.trim();
  if (organizationId && themeName) {
    const { data } = await client
      .from("layout_schemas")
      .select("id,schema")
      .eq("organization_id", organizationId)
      .eq("name", themeName)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      return {
        themeId: data.id,
        branding: normalizeGalleryBranding(organizationBranding),
      };
    }
  }

  return {
    themeId: null,
    branding: normalizeGalleryBranding(organizationBranding),
  };
}

async function readOrganizationBranding(
  client: SupabaseClient,
  organizationId: string,
) {
  const { data } = await client
    .from("organizations")
    .select("gallery_branding")
    .eq("id", organizationId)
    .maybeSingle();
  return data?.gallery_branding;
}
