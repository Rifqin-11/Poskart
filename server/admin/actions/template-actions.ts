"use server";

import { createClient } from "@/lib/supabase/server";
import {
  assertSupabaseResult,
  mapTemplate,
  countPhotoSlotsFromLayout,
  type Template,
  type TemplateFormValues,
  type TemplateRow,
} from "../_shared/admin-types";

async function verifyAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function getTemplates(): Promise<Template[]> {
  const { supabase } = await verifyAuth();
  const { data, error } = await supabase
    .from("templates")
    .select(
      "id,name,category,status,assigned_booths,updated_at_label,display_order,usage_count,tagline,photo_count,accent_color,frame_image_url,frame_layout,is_default",
    )
    .order("display_order", { ascending: true })
    .order("updated_at", { ascending: false });

  return assertSupabaseResult(
    data as TemplateRow[] | null,
    error,
    "Unable to load templates",
  ).map(mapTemplate);
}

export async function createTemplate(values: TemplateFormValues): Promise<void> {
  const { supabase } = await verifyAuth();
  const now = new Date().toISOString();
  const id = `TPL-${Date.now()}`;
  const photoCount = countPhotoSlotsFromLayout(values.frameLayout);
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
  const { supabase } = await verifyAuth();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_at_label: "just now",
  };

  if (values.name !== undefined) patch.name = values.name;
  if (values.category !== undefined) patch.category = values.category;
  if (values.status !== undefined) patch.status = values.status;
  if (values.tagline !== undefined) patch.tagline = values.tagline || null;
  if (values.accentColor !== undefined) patch.accent_color = values.accentColor;
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
  const { supabase } = await verifyAuth();
  const { error } = await supabase.from("templates").delete().eq("id", id);
  if (error) throw new Error(`Unable to delete template: ${error.message}`);
}

export async function reorderTemplates(templateIds: string[]): Promise<void> {
  if (templateIds.length === 0) return;

  const { supabase } = await verifyAuth();
  const { error } = await supabase.rpc("reorder_templates", {
    template_ids: templateIds,
  });
  if (error) {
    throw new Error(`Unable to reorder templates: ${error.message}`);
  }
}
