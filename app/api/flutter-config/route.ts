import { NextResponse } from "next/server";
import { sanitizeLayoutSchema } from "@/lib/builder/schema";
import { createClient } from "@/lib/supabase/server";
import type { LayoutSchema } from "@/types/builder";

/**
 * GET /api/flutter-config
 *
 * Public endpoint consumed by the Flutter app at startup for live config sync.
 * Aggregates:
 *  - app_configs       → operational settings (timers, merchant, URLs)
 *  - layout_schemas    → visual builder schema (canvas + per-screen nodes)
 *  - theme_presets     → active design tokens (colors, radius, fonts)
 *  - templates         → frame templates for the picker screen
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const [configResult, layoutResult, themeResult, templatesResult] =
      await Promise.all([
        supabase
          .from("app_configs")
          .select("*")
          .eq("id", "default")
          .maybeSingle(),
        supabase
          .from("layout_schemas")
          .select("id,schema")
          .eq("id", "default-photobooth")
          .maybeSingle(),
        supabase
          .from("theme_presets")
          .select("id,schema")
          .eq("status", "published")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("templates")
          .select(
            "id,name,category,status,tagline,photo_count,accent_color,frame_image_url,frame_layout,is_default",
          )
          .eq("status", "published")
          .order("is_default", { ascending: false }),
      ]);

    const config = configResult.data;
    const layout = layoutResult.data;
    const theme = themeResult.data;
    const templates = templatesResult.data ?? [];

    const flutterConfig = {
      version: 1,
      generatedAt: new Date().toISOString(),

      // Operational settings
      operationalSettings: config
        ? {
            merchantName: config.merchant_name,
            qrisPayloadPrefix: config.qris_payload_prefix,
            shareBaseUrl: config.share_base_url,
            countdownDurationSeconds: config.countdown_duration_seconds,
            flashDurationMs: config.flash_duration_ms,
            autoReturnDurationSeconds: config.auto_return_duration_seconds,
            defaultTemplateId: config.default_template_id ?? null,
            // Extended settings (admin Settings tabs)
            printerName: config.printer_name ?? null,
            boothTimeoutSeconds: config.booth_timeout_seconds ?? null,
            downloadExpiryHours: config.download_expiry_hours ?? null,
            watermarkEnabled: config.watermark_enabled ?? null,
            maintenanceMode: config.maintenance_mode ?? false,
            qrisAutoRetry: config.qris_auto_retry ?? null,
          }
        : null,

      // Visual builder schema (nodes per screen)
      layoutSchema: layout?.schema
        ? sanitizeLayoutSchema(layout.schema as LayoutSchema)
        : null,

      // Active design tokens
      designTokens: theme?.schema ?? null,

      // Frame templates for the picker
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        tagline: t.tagline ?? null,
        photoCount: t.photo_count,
        accentColor: t.accent_color,
        frameImageUrl: t.frame_image_url ?? null,
        frameLayout: t.frame_layout ?? null,
        isDefault: t.is_default,
      })),
    };

    return NextResponse.json(flutterConfig, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load Flutter config",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
