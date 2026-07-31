"use server";

import {
  getAdminContext,
  getAdminMembership,
  verifyRole,
} from "@/server/admin/context";
import type { TemplateShowcaseSettings } from "@/types/template";
import {
  assertSupabaseResult,
  mapTemplate,
  countPhotoSlotsFromLayout,
  type Template,
  type TemplateFormValues,
  type TemplateRow,
} from "../_shared/admin-types";

function normalizeFrameCategoryId(value: string | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

async function assertFrameCategoryAccess(
  supabase: Awaited<ReturnType<typeof verifyRole>>["supabase"],
  frameCategoryId: string | null,
) {
  if (!frameCategoryId) return;
  const { data, error } = await supabase
    .from("frame_categories")
    .select("id")
    .eq("id", frameCategoryId)
    .maybeSingle();
  if (error || !data) {
    throw new Error("Selected frame category is unavailable.");
  }
}

export async function getTemplates(): Promise<Template[]> {
  const { supabase } = await getAdminContext();
  const { data, error } = await supabase
    .from("templates")
    .select(
      "id,name,category,status,assigned_booths,updated_at_label,display_order,usage_count,tagline,photo_count,accent_color,frame_category_id,frame_image_url,frame_layout,is_default,is_showcase",
    )
    .order("display_order", { ascending: true })
    .order("updated_at", { ascending: false });

  return assertSupabaseResult(
    data as TemplateRow[] | null,
    error,
    "Unable to load templates",
  ).map(mapTemplate);
}

export async function getTemplateShowcaseSettings(): Promise<TemplateShowcaseSettings> {
  const { supabase } = await getAdminContext();
  const membership = await getAdminMembership();
  if (!membership) throw new Error("Organization membership not found");
  const { data, error } = await supabase
    .from("organizations")
    .select("name,showcase_public_token")
    .eq("id", membership.organizationId)
    .maybeSingle();

  if (error || !data?.showcase_public_token) {
    throw new Error(
      `Unable to load showcase settings${error ? `: ${error.message}` : ""}`,
    );
  }

  return {
    organizationName: data.name,
    publicToken: data.showcase_public_token,
  };
}

export async function setTemplateShowcase(
  id: string,
  isShowcase: boolean,
): Promise<void> {
  const { supabase } = await verifyRole(["owner", "admin", "designer"]);
  const { data: template, error: templateError } = await supabase
    .from("templates")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (templateError || !template) {
    throw new Error(
      `Unable to load template${templateError ? `: ${templateError.message}` : ""}`,
    );
  }
  if (isShowcase && template.status !== "published") {
    throw new Error("Publish the template before adding it to the showcase.");
  }

  const { error } = await supabase
    .from("templates")
    .update({ is_showcase: isShowcase, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    throw new Error(`Unable to update showcase: ${error.message}`);
  }
}

export async function createTemplate(
  values: TemplateFormValues,
): Promise<void> {
  const { supabase } = await verifyRole(["owner", "admin", "designer"]);
  const now = new Date().toISOString();
  const id = `TPL-${Date.now()}`;
  const photoCount = countPhotoSlotsFromLayout(values.frameLayout);
  const frameCategoryId = normalizeFrameCategoryId(values.frameCategoryId);
  await assertFrameCategoryAccess(supabase, frameCategoryId);
  const { data: lastTemplate, error: orderError } = await supabase
    .from("templates")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (orderError) {
    throw new Error(
      `Unable to determine template order: ${orderError.message}`,
    );
  }

  const { error } = await supabase.from("templates").insert({
    id,
    name: values.name,
    category: values.category,
    status: values.status,
    assigned_booths: 0,
    updated_at_label: "just now",
    tagline: values.tagline || null,
    photo_count: photoCount,
    accent_color: values.accentColor,
    frame_category_id: frameCategoryId,
    frame_image_url: values.frameImageUrl || null,
    frame_layout: values.frameLayout ?? null,
    is_default: values.isDefault,
    display_order: (lastTemplate?.display_order ?? -1) + 1,
    updated_at: now,
  });

  if (error) throw new Error(`Unable to create template: ${error.message}`);
}

export async function updateTemplate(
  id: string,
  values: Partial<TemplateFormValues>,
): Promise<void> {
  const { supabase } = await verifyRole(["owner", "admin", "designer"]);
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_at_label: "just now",
  };

  if (values.name !== undefined) patch.name = values.name;
  if (values.category !== undefined) patch.category = values.category;
  if (values.status !== undefined) patch.status = values.status;
  if (values.tagline !== undefined) patch.tagline = values.tagline || null;
  if (values.accentColor !== undefined) patch.accent_color = values.accentColor;
  if (values.frameCategoryId !== undefined) {
    const frameCategoryId = normalizeFrameCategoryId(values.frameCategoryId);
    await assertFrameCategoryAccess(supabase, frameCategoryId);
    patch.frame_category_id = frameCategoryId;
  }
  if (values.frameImageUrl !== undefined)
    patch.frame_image_url = values.frameImageUrl || null;
  if (values.frameLayout !== undefined) {
    patch.frame_layout = values.frameLayout ?? null;
    patch.photo_count = countPhotoSlotsFromLayout(values.frameLayout);
  } else if (values.photoCount !== undefined) {
    patch.photo_count = values.photoCount;
  }
  if (values.isDefault !== undefined) patch.is_default = values.isDefault;

  const { error } = await supabase.from("templates").update(patch).eq("id", id);
  if (error) throw new Error(`Unable to update template: ${error.message}`);
}

export async function deleteTemplate(id: string): Promise<void> {
  const { supabase } = await verifyRole(["owner", "admin", "designer"]);
  const { error } = await supabase.from("templates").delete().eq("id", id);
  if (error) throw new Error(`Unable to delete template: ${error.message}`);
}

export async function reorderTemplates(templateIds: string[]): Promise<void> {
  if (templateIds.length === 0) return;

  const { supabase } = await verifyRole(["owner", "admin", "designer"]);
  const { error } = await supabase.rpc("reorder_templates", {
    template_ids: templateIds,
  });
  if (error) {
    throw new Error(`Unable to reorder templates: ${error.message}`);
  }
}

export async function moveTemplateToFrameCategory(
  templateId: string,
  frameCategoryId: string | null,
  templateIds: string[],
): Promise<void> {
  if (templateIds.length === 0) return;

  const { supabase } = await verifyRole(["owner", "admin", "designer"]);
  const normalizedFrameCategoryId = frameCategoryId?.trim() || null;
  await assertFrameCategoryAccess(supabase, normalizedFrameCategoryId);

  const { error } = await supabase.rpc("move_template_to_frame_category", {
    target_template_id: templateId,
    target_frame_category_id: normalizedFrameCategoryId,
    template_ids: templateIds,
  });
  if (error) {
    throw new Error(`Unable to move template: ${error.message}`);
  }
}
