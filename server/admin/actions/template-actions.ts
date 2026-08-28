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
import type {
  FrameInsightsPeriod,
  FrameUsageInsight,
} from "@/types/template";
import {
  assertFrameHasPhotoSlot,
  countUsableFramePhotoSlots,
} from "@/lib/builder/frame-layout-validation";
import { finalizeMusicEmbed } from "@/lib/music/embed";

/**
 * The music embed is operator-supplied, so the iframe URL is always recomputed
 * from the pasted link before it reaches the database.
 */
function sanitizeFrameLayout(
  frameLayout: TemplateFormValues["frameLayout"] | undefined,
) {
  if (!frameLayout) return frameLayout ?? null;
  const music = finalizeMusicEmbed(frameLayout.music);
  return { ...frameLayout, music: music.url ? music : null };
}

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
      "id,name,category,status,assigned_booths,created_at,updated_at_label,display_order,usage_count,tagline,photo_count,accent_color,frame_category_id,frame_image_url,frame_layout,is_default,print_length_mm",
    )
    .order("display_order", { ascending: true })
    .order("updated_at", { ascending: false });

  return assertSupabaseResult(
    data as TemplateRow[] | null,
    error,
    "Unable to load templates",
  ).map(mapTemplate);
}

export async function getFrameUsageInsights(
  period: FrameInsightsPeriod,
): Promise<FrameUsageInsight[]> {
  if (period !== "7d" && period !== "30d" && period !== "90d" && period !== "all") {
    throw new Error("Invalid frame insights period.");
  }
  const { supabase } = await getAdminContext();
  const daysByPeriod: Record<Exclude<FrameInsightsPeriod, "all">, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
  };
  const fromAt =
    period === "all"
      ? null
      : new Date(
          Date.now() - daysByPeriod[period] * 24 * 60 * 60 * 1000,
        ).toISOString();

  const { data, error } = await supabase.rpc("get_frame_usage_insights", {
    p_from_at: fromAt,
  });
  if (error) {
    throw new Error(`Unable to load frame insights: ${error.message}`);
  }

  return ((data ?? []) as Array<{
    template_id: string;
    session_count: number | string | null;
    active_days: number | string | null;
    last_used_at: string | null;
    assigned_devices: number | string | null;
  }>).map((row) => ({
    templateId: row.template_id,
    sessionCount: Number(row.session_count ?? 0),
    activeDays: Number(row.active_days ?? 0),
    lastUsedAt: row.last_used_at,
    assignedDevices: Number(row.assigned_devices ?? 0),
  }));
}

export async function createTemplate(
  values: TemplateFormValues,
): Promise<string> {
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
    frame_layout: sanitizeFrameLayout(values.frameLayout),
    is_default: values.isDefault,
    print_length_mm: normalizePrintLengthMm(values.printLengthMm),
    display_order: (lastTemplate?.display_order ?? -1) + 1,
    updated_at: now,
  });

  if (error) throw new Error(`Unable to create template: ${error.message}`);
  return id;
}

export async function assignTemplateToDevices(
  templateId: string,
  deviceIds: string[],
): Promise<void> {
  const { supabase, organizationId } = await verifyRole([
    "owner",
    "admin",
    "designer",
  ]);
  const normalizedTemplateId = templateId.trim();
  const normalizedDeviceIds = Array.from(
    new Set(deviceIds.map((deviceId) => deviceId.trim()).filter(Boolean)),
  );

  if (!normalizedTemplateId || normalizedDeviceIds.length === 0) return;

  const { data: template, error: templateError } = await supabase
    .from("templates")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("id", normalizedTemplateId)
    .eq("category", "frame")
    .maybeSingle();
  if (templateError) {
    throw new Error(`Unable to validate frame template: ${templateError.message}`);
  }
  if (!template) throw new Error("Frame template is unavailable.");

  const { data: devices, error: devicesError } = await supabase
    .from("devices")
    .select("id,frame_templates")
    .eq("organization_id", organizationId)
    .in("id", normalizedDeviceIds);
  if (devicesError) {
    throw new Error(`Unable to load devices: ${devicesError.message}`);
  }
  if ((devices?.length ?? 0) !== normalizedDeviceIds.length) {
    throw new Error("One or more selected devices are unavailable.");
  }

  for (const device of devices ?? []) {
    const currentTemplateIds = Array.isArray(device.frame_templates)
      ? device.frame_templates.filter(
          (value): value is string => typeof value === "string",
        )
      : [];
    const targetTemplateIds = [
      normalizedTemplateId,
      ...currentTemplateIds.filter((id) => id !== normalizedTemplateId),
    ];
    const { error } = await supabase.rpc("set_device_frame_templates", {
      target_device_id: device.id,
      target_template_ids: targetTemplateIds,
    });
    if (error) {
      throw new Error(
        `Unable to assign frame to device ${device.id}: ${error.message}`,
      );
    }
  }
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
    patch.frame_layout = sanitizeFrameLayout(values.frameLayout);
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
    throw new Error(
      "Frame assignments could not be checked. Please try again before deleting the frame.",
    );
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
  if (error) throw new Error("Frame could not be deleted. Please try again.");
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
