import "server-only";

import { cache } from "react";
import {
  normalizeAssetReferences,
  normalizeAssetUrl,
} from "@/lib/assets/asset-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { FrameLayout } from "@/types/frame-template";

export type PublicShowcaseTemplate = {
  id: string;
  name: string;
  tagline: string | null;
  photoCount: number;
  accentColor: string;
  frameImageUrl: string | null;
  frameLayout: FrameLayout | null;
  categoryName: string | null;
};

export type PublicTemplateShowcase = {
  organizationName: string;
  templates: PublicShowcaseTemplate[];
};

type PublicTemplateRow = {
  id: string;
  name: string;
  tagline: string | null;
  photo_count: number | null;
  accent_color: string | null;
  frame_image_url: unknown;
  frame_layout: unknown;
  frame_category_id: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const getPublicTemplateShowcase = cache(
  async (token: string): Promise<PublicTemplateShowcase | null> => {
    const normalizedToken = token.trim();
    if (!UUID_PATTERN.test(normalizedToken)) return null;

    const supabase = createSupabaseAdminClient();
    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("id,name")
      .eq("showcase_public_token", normalizedToken)
      .maybeSingle();

    if (organizationError) {
      throw new Error(
        `Unable to load public showcase: ${organizationError.message}`,
      );
    }
    if (!organization) return null;

    const [templatesResult, categoriesResult] = await Promise.all([
      supabase
        .from("templates")
        .select(
          "id,name,tagline,photo_count,accent_color,frame_image_url,frame_layout,frame_category_id",
        )
        .eq("organization_id", organization.id)
        .eq("is_showcase", true)
        .eq("status", "published")
        .order("display_order", { ascending: true })
        .order("updated_at", { ascending: false }),
      supabase
        .from("frame_categories")
        .select("id,name")
        .eq("organization_id", organization.id)
        .order("display_order", { ascending: true }),
    ]);

    if (templatesResult.error) {
      throw new Error(
        `Unable to load showcase frames: ${templatesResult.error.message}`,
      );
    }
    if (categoriesResult.error) {
      throw new Error(
        `Unable to load showcase categories: ${categoriesResult.error.message}`,
      );
    }

    const categoryNames = new Map(
      (categoriesResult.data ?? []).map((category) => [
        category.id,
        category.name,
      ]),
    );

    return {
      organizationName: organization.name,
      templates: ((templatesResult.data ?? []) as PublicTemplateRow[]).map(
        (template) => ({
          id: template.id,
          name: template.name,
          tagline: template.tagline,
          photoCount: template.photo_count ?? 0,
          accentColor: template.accent_color ?? "#00357B",
          frameImageUrl: normalizeAssetUrl(template.frame_image_url),
          frameLayout: normalizeAssetReferences(
            template.frame_layout,
          ) as FrameLayout | null,
          categoryName: template.frame_category_id
            ? categoryNames.get(template.frame_category_id) ?? null
            : null,
        }),
      ),
    };
  },
);
