import "server-only";

import { cache } from "react";
import {
  normalizeAssetReferences,
  normalizeAssetUrl,
} from "@/lib/assets/asset-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { LayoutSchema } from "@/types/builder";
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

export type PublicShowcaseTheme = {
  id: string;
  name: string;
  schema: LayoutSchema;
};

export type PublicTemplateShowcase = {
  name: string;
  description: string | null;
  organizationName: string;
  templates: PublicShowcaseTemplate[];
  themes: PublicShowcaseTheme[];
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

type PublicThemeRow = {
  id: string;
  name: string;
  schema: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const getPublicTemplateShowcase = cache(
  async (token: string): Promise<PublicTemplateShowcase | null> => {
    const normalizedToken = token.trim();
    if (!UUID_PATTERN.test(normalizedToken)) return null;

    const supabase = createSupabaseAdminClient();
    const { data: showcase, error: showcaseError } = await supabase
      .from("showcases")
      .select("id,organization_id,name,description")
      .eq("public_token", normalizedToken)
      .maybeSingle();

    if (showcaseError) {
      throw new Error(`Unable to load public showcase: ${showcaseError.message}`);
    }
    if (!showcase) return null;

    const [organizationResult, templateLinksResult, themeLinksResult, categoriesResult] =
      await Promise.all([
        supabase
          .from("organizations")
          .select("name")
          .eq("id", showcase.organization_id)
          .maybeSingle(),
        supabase
          .from("showcase_templates")
          .select("template_id,display_order")
          .eq("showcase_id", showcase.id)
          .order("display_order", { ascending: true }),
        supabase
          .from("showcase_themes")
          .select("layout_schema_id,display_order")
          .eq("showcase_id", showcase.id)
          .order("display_order", { ascending: true }),
        supabase
          .from("frame_categories")
          .select("id,name")
          .eq("organization_id", showcase.organization_id)
          .order("display_order", { ascending: true }),
      ]);

    if (organizationResult.error || !organizationResult.data) {
      throw new Error(
        `Unable to load showcase organization${organizationResult.error ? `: ${organizationResult.error.message}` : ""}`,
      );
    }
    if (templateLinksResult.error) {
      throw new Error(
        `Unable to load showcase frames: ${templateLinksResult.error.message}`,
      );
    }
    if (themeLinksResult.error) {
      throw new Error(
        `Unable to load showcase themes: ${themeLinksResult.error.message}`,
      );
    }
    if (categoriesResult.error) {
      throw new Error(
        `Unable to load showcase categories: ${categoriesResult.error.message}`,
      );
    }

    const templateIds = (templateLinksResult.data ?? []).map(
      (item) => item.template_id,
    );
    const themeIds = (themeLinksResult.data ?? []).map(
      (item) => item.layout_schema_id,
    );
    const [templatesResult, themesResult] = await Promise.all([
      templateIds.length
        ? supabase
            .from("templates")
            .select(
              "id,name,tagline,photo_count,accent_color,frame_image_url,frame_layout,frame_category_id",
            )
            .eq("organization_id", showcase.organization_id)
            .eq("category", "frame")
            .eq("status", "published")
            .in("id", templateIds)
        : Promise.resolve({ data: [], error: null }),
      themeIds.length
        ? supabase
            .from("layout_schemas")
            .select("id,name,schema")
            .eq("organization_id", showcase.organization_id)
            .in("id", themeIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (templatesResult.error) {
      throw new Error(
        `Unable to load showcase frames: ${templatesResult.error.message}`,
      );
    }
    if (themesResult.error) {
      throw new Error(
        `Unable to load showcase themes: ${themesResult.error.message}`,
      );
    }

    const categoryNames = new Map(
      (categoriesResult.data ?? []).map((category) => [category.id, category.name]),
    );
    const templatesById = new Map(
      ((templatesResult.data ?? []) as PublicTemplateRow[]).map((template) => [
        template.id,
        template,
      ]),
    );
    const themesById = new Map(
      ((themesResult.data ?? []) as PublicThemeRow[]).map((theme) => [theme.id, theme]),
    );

    return {
      name: showcase.name,
      description: showcase.description,
      organizationName: organizationResult.data.name,
      templates: templateIds.flatMap((id) => {
        const template = templatesById.get(id);
        if (!template) return [];
        return [
          {
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
          },
        ];
      }),
      themes: themeIds.flatMap((id) => {
        const theme = themesById.get(id);
        if (!theme) return [];
        return [
          {
            id: theme.id,
            name: theme.name,
            schema: normalizeAssetReferences(theme.schema) as LayoutSchema,
          },
        ];
      }),
    };
  },
);
