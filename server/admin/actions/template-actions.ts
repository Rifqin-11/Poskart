"use server";

import {
  getAdminContext,
  verifyRole,
} from "@/server/admin/context";
import {
  assertSupabaseResult,
  mapTemplate,
  type Template,
  type TemplateFormValues,
  type TemplateRow,
} from "../_shared/admin-types";
import {
  assertFrameHasPhotoSlot,
  countUsableFramePhotoSlots,
} from "@/lib/builder/frame-layout-validation";

function normalizeFrameCategoryId(value: string | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

function assertFrameCategoryHasPhotoSlot(
  category: string | undefined,
  frameLayout: TemplateFormValues["frameLayout"] | undefined,
) {
  if (category !== "frame") return;
  assertFrameHasPhotoSlot(frameLayout);
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
      "id,name,category,status,assigned_booths,updated_at_label,display_order,usage_count,tagline,photo_count,accent_color,frame_category_id,frame_image_url,frame_layout,is_default,print_length_mm",
    )
    .order("display_order", { ascending: true })
    .order("updated_at", { ascending: false });

  return assertSupabaseResult(
    data as TemplateRow[] | null,
    error,
    "Unable to load templates",
  ).map(mapTemplate);
}

export async function createTemplate(
  values: TemplateFormValues,
): Promise<void> {
  const { supabase } = await verifyRole(["owner", "admin", "designer"]);
  assertFrameCategoryHasPhotoSlot(values.category, values.frameLayout);
  const now = new Date().toISOString();
  const id = `TPL-${Date.now()}`;
  const photoCount = countUsableFramePhotoSlots(values.frameLayout);
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
    print_length_mm: normalizePrintLengthMm(values.printLengthMm),
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
    let category = values.category;
    if (category === undefined) {
      const existing = await supabase
        .from("templates")
        .select("category")
        .eq("id", id)
        .maybeSingle();
      if (existing.error) {
        throw new Error(`Unable to validate template: ${existing.error.message}`);
      }
      category = existing.data?.category;
    }
    assertFrameCategoryHasPhotoSlot(category, values.frameLayout);
    patch.frame_layout = values.frameLayout ?? null;
    patch.photo_count = countUsableFramePhotoSlots(values.frameLayout);
  } else if (values.photoCount !== undefined) {
    patch.photo_count = values.photoCount;
  }
  if (values.isDefault !== undefined) patch.is_default = values.isDefault;
  if (values.printLengthMm !== undefined) {
    patch.print_length_mm = normalizePrintLengthMm(values.printLengthMm);
  }

  const { error } = await supabase.from("templates").update(patch).eq("id", id);
  if (error) throw new Error(`Unable to update template: ${error.message}`);
}

function normalizePrintLengthMm(value: number | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 150;
  return Math.min(1000, Math.max(20, parsed));
}

export async function deleteTemplate(id: string): Promise<void> {
  const { supabase } = await verifyRole(["owner", "admin", "designer"]);

  // Check if this template is still assigned to any device before deleting.
  const { data: assignments, error: assignmentError } = await supabase
    .from("device_frame_templates")
    .select("device_id, devices(name)")
    .eq("template_id", id)
    .limit(5);

  if (assignmentError) {
    throw new Error(`Unable to check template assignments: ${assignmentError.message}`);
  }

  if (assignments && assignments.length > 0) {
    const deviceNames = assignments
      .map((a: { devices: { name?: string }[] | null }) => {
        const d = Array.isArray(a.devices) ? a.devices[0] : a.devices;
        return (d as { name?: string } | null)?.name;
      })
      .filter(Boolean)
      .join(", ");
    const suffix = deviceNames
      ? ` (${deviceNames})`
      : ` (${assignments.length} device${assignments.length > 1 ? "s" : ""})`;
    throw new Error(
      `Template masih digunakan oleh ${assignments.length} device${suffix}. Hapus assignment dari halaman Devices terlebih dahulu sebelum menghapus template ini.`,
    );
  }

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
