"use server";

import { getAdminContext, getAdminMembership, verifyRole } from "@/server/admin/context";
import type { Showcase, ShowcaseInput } from "@/types/showcase";

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
};

function validateShowcaseInput(input: ShowcaseInput): ShowcaseInput {
  const name = input.name.trim();
  const description = input.description.trim();
  if (!name || name.length > 100) {
    throw new Error("Showcase name must contain 1 to 100 characters.");
  }
  if (description.length > 600) {
    throw new Error("Showcase description cannot exceed 600 characters.");
  }

  return {
    name,
    description,
    templateIds: [...new Set(input.templateIds)],
    themeIds: [...new Set(input.themeIds)],
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getShowcases(): Promise<Showcase[]> {
  const { supabase } = await getAdminContext();
  const membership = await getAdminMembership();
  if (!membership) throw new Error("Organization membership not found");

  const { data, error } = await supabase
    .from("showcases")
    .select(
      "id,name,description,public_token,created_at,updated_at,showcase_templates(template_id,display_order),showcase_themes(layout_schema_id,display_order)",
    )
    .eq("organization_id", membership.organizationId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Unable to load showcases: ${error.message}`);
  return ((data ?? []) as ShowcaseRow[]).map(mapShowcase);
}

export async function createShowcase(input: ShowcaseInput): Promise<string> {
  const values = validateShowcaseInput(input);
  const { supabase } = await verifyRole(["owner", "admin", "designer"]);
  const { data, error } = await supabase.rpc("save_showcase", {
    target_showcase_id: null,
    target_name: values.name,
    target_description: values.description,
    target_template_ids: values.templateIds,
    target_theme_ids: values.themeIds,
  });

  if (error) throw new Error(`Unable to create showcase: ${error.message}`);
  if (typeof data !== "string") throw new Error("Showcase could not be created.");
  return data;
}

export async function updateShowcase(
  id: string,
  input: ShowcaseInput,
): Promise<string> {
  const values = validateShowcaseInput(input);
  const { supabase } = await verifyRole(["owner", "admin", "designer"]);
  const { data, error } = await supabase.rpc("save_showcase", {
    target_showcase_id: id,
    target_name: values.name,
    target_description: values.description,
    target_template_ids: values.templateIds,
    target_theme_ids: values.themeIds,
  });

  if (error) throw new Error(`Unable to update showcase: ${error.message}`);
  if (typeof data !== "string") throw new Error("Showcase could not be updated.");
  return data;
}

export async function deleteShowcase(id: string): Promise<void> {
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
