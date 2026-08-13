import {
  buildKioskBootstrap,
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";
import {
  countUsableFramePhotoSlots,
  FRAME_PHOTO_SLOT_REQUIRED_MESSAGE,
} from "@/lib/builder/frame-layout-validation";

type SaveTemplateBody = {
  deviceId?: string;
  template?: {
    id?: string;
    name?: string;
    tagline?: string;
    photoCount?: number;
    accentColor?: string;
    frameImageUrl?: string | null;
    frameLayout?: Record<string, unknown> | null;
    isDefault?: boolean;
    displayOrder?: number;
  };
};

export async function GET(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const deviceId = new URL(request.url).searchParams.get("deviceId");
    const bootstrap = await buildKioskBootstrap(context, deviceId);
    return jsonOk({ templates: bootstrap.templates });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = (await request.json()) as SaveTemplateBody;
    const device = await requireOrganizationDevice(
      context,
      body.deviceId ?? "",
    );
    const template = body.template;
    const id = template?.id?.trim();
    const name = template?.name?.trim();

    if (!id || id.length > 160 || !name || name.length > 120) {
      return jsonOk(
        {
          error: "Template ID and name are required.",
          code: "TEMPLATE_VALIDATION_FAILED",
        },
        { status: 400 },
      );
    }
    if (
      template?.frameLayout != null &&
      (typeof template.frameLayout !== "object" ||
        Array.isArray(template.frameLayout))
    ) {
      return jsonOk(
        {
          error: "Template layout is invalid.",
          code: "TEMPLATE_LAYOUT_INVALID",
        },
        { status: 400 },
      );
    }
    const photoSlotCount = countUsableFramePhotoSlots(template?.frameLayout);
    if (photoSlotCount < 1) {
      return jsonOk(
        {
          error: FRAME_PHOTO_SLOT_REQUIRED_MESSAGE,
          code: "FRAME_PHOTO_SLOT_REQUIRED",
        },
        { status: 400 },
      );
    }

    const { data: existing, error: existingError } = await context.client
      .from("templates")
      .select(
        "id,organization_id,category,frame_category_id,is_default,display_order",
      )
      .eq("id", id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (
      existing &&
      existing.organization_id &&
      existing.organization_id !== context.organizationId
    ) {
      return jsonOk(
        {
          error: "Template belongs to another organization.",
          code: "TEMPLATE_ORGANIZATION_MISMATCH",
        },
        { status: 403 },
      );
    }

    let displayOrder = existing?.display_order;
    if (typeof displayOrder !== "number") {
      const { data: lastTemplate, error: lastTemplateError } =
        await context.client
          .from("templates")
          .select("display_order")
          .eq("organization_id", context.organizationId)
          .order("display_order", { ascending: false })
          .limit(1)
          .maybeSingle();
      if (lastTemplateError) throw lastTemplateError;
      displayOrder = (lastTemplate?.display_order ?? -1) + 1;
    }

    const photoCount = Math.min(8, photoSlotCount);
    const accentColor =
      typeof template?.accentColor === "string" &&
      /^#[0-9a-fA-F]{6}$/.test(template.accentColor)
        ? template.accentColor.toUpperCase()
        : "#00357B";
    const frameImageUrl = template?.frameImageUrl?.trim() || null;
    const now = new Date().toISOString();

    const { error: upsertError } = await context.client
      .from("templates")
      .upsert(
        {
          id,
          organization_id: context.organizationId,
          name,
          category: existing?.category ?? "frame",
          status: "published",
          tagline: template?.tagline?.trim() || null,
          photo_count: photoCount,
          accent_color: accentColor,
          frame_category_id: existing?.frame_category_id ?? null,
          frame_image_url: frameImageUrl,
          frame_layout: template?.frameLayout ?? null,
          is_default: existing?.is_default ?? template?.isDefault === true,
          display_order: displayOrder,
          updated_at: now,
        },
        { onConflict: "id" },
      );
    if (upsertError) throw upsertError;

    const { data: existingAssignment, error: assignmentLookupError } =
      await context.client
        .from("device_frame_templates")
        .select("display_order")
        .eq("device_id", device.id)
        .eq("template_id", id)
        .maybeSingle();
    if (assignmentLookupError) throw assignmentLookupError;

    const { error: assignmentError } = await context.client
      .from("device_frame_templates")
      .upsert(
        {
          device_id: device.id,
          template_id: id,
          organization_id: context.organizationId,
          display_order: existingAssignment?.display_order ?? displayOrder,
        },
        { onConflict: "device_id,template_id" },
      );
    if (assignmentError) throw assignmentError;

    return jsonOk({
      id,
      name,
      displayOrder,
      frameCategoryId: existing?.frame_category_id ?? null,
    });
  } catch (error) {
    return jsonError(error);
  }
}
