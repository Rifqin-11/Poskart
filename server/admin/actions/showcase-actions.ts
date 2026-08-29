"use server";

import { getAdminContext, getAdminMembership, verifyRole } from "@/server/admin/context";
import { hasOrganizationFeatureAccess } from "@/server/admin/organization-feature-access";
import { randomBytes } from "node:crypto";
import type {
  Showcase,
  ShowcaseCustomItemInput,
  ShowcaseInput,
} from "@/types/showcase";

type ShowcaseRow = {
  id: string;
  name: string;
  description: string | null;
  public_token: string;
  created_at: string;
  updated_at: string;
  showcase_templates: Array<{
    template_id: string;
    display_order: number;
  }> | null;
  showcase_themes: Array<{
    layout_schema_id: string;
    display_order: number;
  }> | null;
  showcase_custom_items: Array<{
    id: string;
    category: string;
    title: string;
    description: string | null;
    image_url: string;
    storage_path: string;
    display_order: number;
  }> | null;
};

function createShowcaseToken(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36) || "showcase";
  const suffix = randomBytes(5).toString("base64url").replace(/[-_]/g, "").slice(0, 7);
  return `${slug}-${suffix}`;
}

function validateCustomItem(
  item: ShowcaseCustomItemInput,
): ShowcaseCustomItemInput {
  const category = item.category.trim();
  const title = item.title.trim();
  const description = item.description.trim();
  const imageUrl = item.imageUrl.trim();
  const storagePath = item.storagePath.trim();

  if (!category || category.length > 60) {
    throw new Error("Custom category must contain 1 to 60 characters.");
  }
  if (!title || title.length > 120) {
    throw new Error("Custom item title must contain 1 to 120 characters.");
  }
  if (description.length > 400) {
    throw new Error("Custom item description cannot exceed 400 characters.");
  }
  if (!imageUrl || !storagePath) {
    throw new Error("Every custom item must use an uploaded image.");
  }

  let parsedImageUrl: URL;
  try {
    parsedImageUrl = new URL(imageUrl);
  } catch {
    throw new Error("A custom item contains an invalid uploaded image URL.");
  }
  if (!["http:", "https:"].includes(parsedImageUrl.protocol)) {
    throw new Error("A custom item contains an invalid uploaded image URL.");
  }

  return { category, title, description, imageUrl, storagePath };
}

function validateShowcaseInput(input: ShowcaseInput): ShowcaseInput {
  const name = input.name.trim();
  const description = input.description.trim();
  const customItems = Array.isArray(input.customItems) ? input.customItems : [];
  if (!name || name.length > 100) {
    throw new Error("Showcase name must contain 1 to 100 characters.");
  }
  if (description.length > 600) {
    throw new Error("Showcase description cannot exceed 600 characters.");
  }
  if (customItems.length > 40) {
    throw new Error("A showcase can contain up to 40 custom items.");
  }

  return {
    name,
    description,
    templateIds: [...new Set(input.templateIds)],
    themeIds: [...new Set(input.themeIds)],
    customItems: customItems.map(validateCustomItem),
  };
}

function mapShowcase(row: ShowcaseRow): Showcase {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    publicToken: row.public_token,
    templateIds: (row.showcase_templates ?? [])
      .slice()
      .sort((a, b) => a.display_order - b.display_order)
      .map((item) => item.template_id),
    themeIds: (row.showcase_themes ?? [])
      .slice()
      .sort((a, b) => a.display_order - b.display_order)
      .map((item) => item.layout_schema_id),
    customItems: (row.showcase_custom_items ?? [])
      .slice()
      .sort((a, b) => a.display_order - b.display_order)
      .map((item) => ({
        id: item.id,
        category: item.category,
        title: item.title,
        description: item.description ?? "",
        imageUrl: item.image_url,
        storagePath: item.storage_path,
      })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getShowcases(): Promise<Showcase[]> {
  if (!(await hasOrganizationFeatureAccess("showcase"))) {
    throw new Error("Showcase is disabled for this organization.");
  }
  const { supabase } = await getAdminContext();
  const membership = await getAdminMembership();
  if (!membership) throw new Error("Organization membership not found");

  const { data, error } = await supabase
    .from("showcases")
    .select(
      "id,name,description,public_token,created_at,updated_at,showcase_templates(template_id,display_order),showcase_themes(layout_schema_id,display_order),showcase_custom_items(id,category,title,description,image_url,storage_path,display_order)",
    )
    .eq("organization_id", membership.organizationId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Unable to load showcases: ${error.message}`);
  return ((data ?? []) as ShowcaseRow[]).map(mapShowcase);
}

export async function createShowcase(input: ShowcaseInput): Promise<string> {
  if (!(await hasOrganizationFeatureAccess("showcase"))) {
    throw new Error("Showcase is disabled for this organization.");
  }
  const values = validateShowcaseInput(input);
  const { supabase } = await verifyRole(["owner", "admin", "designer"]);
  const { data, error } = await supabase.rpc("save_showcase", {
    target_showcase_id: null,
    target_name: values.name,
    target_description: values.description,
    target_template_ids: values.templateIds,
    target_theme_ids: values.themeIds,
    target_custom_items: values.customItems,
  });

  if (error) throw new Error(`Unable to create showcase: ${error.message}`);
  if (typeof data !== "string") throw new Error("Showcase could not be created.");
  const { error: tokenError } = await supabase
    .from("showcases")
    .update({ public_token: createShowcaseToken(values.name) })
    .eq("id", data);
  if (tokenError) throw new Error(`Unable to create showcase link: ${tokenError.message}`);
  return data;
}

export async function updateShowcase(
  id: string,
  input: ShowcaseInput,
): Promise<string> {
  if (!(await hasOrganizationFeatureAccess("showcase"))) {
    throw new Error("Showcase is disabled for this organization.");
  }
  const values = validateShowcaseInput(input);
  const { supabase } = await verifyRole(["owner", "admin", "designer"]);
  const { data, error } = await supabase.rpc("save_showcase", {
    target_showcase_id: id,
    target_name: values.name,
    target_description: values.description,
    target_template_ids: values.templateIds,
    target_theme_ids: values.themeIds,
    target_custom_items: values.customItems,
  });

  if (error) throw new Error(`Unable to update showcase: ${error.message}`);
  if (typeof data !== "string") throw new Error("Showcase could not be updated.");
  return data;
}

export async function deleteShowcase(id: string): Promise<void> {
  if (!(await hasOrganizationFeatureAccess("showcase"))) {
    throw new Error("Showcase is disabled for this organization.");
  }
  const { supabase, organizationId } = await verifyRole([
    "owner",
    "admin",
    "designer",
  ]);
  const { error } = await supabase
    .from("showcases")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) throw new Error(`Unable to delete showcase: ${error.message}`);
}
