"use server";

import { getAdminContext, verifyRole } from "@/server/admin/context";
import { sanitizeLayoutSchema } from "@/lib/builder/schema";
import { normalizeAssetReferences } from "@/lib/assets/asset-url";
import {
  assertSupabaseResult,
  type LayoutSchema,
  type LayoutSchemaRow,
  type ActiveThemeStatistics,
  type ThemeGallerySessionRow,
  type ThemePrintSaleRow,
  type ThemePreset,
  type ThemePresetRow,
  type ThemeSchema,
} from "../_shared/admin-types";

export async function getLayoutSchemas(): Promise<LayoutSchemaRow[]> {
  const { supabase } = await getAdminContext();
  const { data, error } = await supabase
    .from("layout_schemas")
    .select("id,name,status,schema,is_active,created_at,updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Unable to load layout schemas: ${error.message}`);
  return (data ?? []).map((row) => ({
    ...row,
    schema: normalizeAssetReferences(row.schema) as LayoutSchema,
  })) as LayoutSchemaRow[];
}

export async function getActiveThemeStatistics(
  themeName: string,
): Promise<ActiveThemeStatistics> {
  const normalizedThemeName = themeName.trim();
  if (!normalizedThemeName) {
    return {
      themeName: "",
      totalSessions: 0,
      totalPrints: 0,
    };
  }

  const { supabase } = await getAdminContext();
  const { data: themeSessions, error: themeSessionsError } = await supabase
    .from("gallery_sessions")
    .select("id")
    .eq("theme_name", normalizedThemeName);

  if (themeSessionsError) {
    throw new Error(
      `Unable to load theme sessions: ${themeSessionsError.message}`,
    );
  }

  const { data: legacyTemplateSessions, error: legacySessionsError } =
    await supabase
      .from("gallery_sessions")
      .select("id")
      .eq("template_name", normalizedThemeName);

  if (legacySessionsError) {
    throw new Error(
      `Unable to load legacy theme sessions: ${legacySessionsError.message}`,
    );
  }

  const sessionRows = [
    ...((themeSessions ?? []) as ThemeGallerySessionRow[]),
    ...((legacyTemplateSessions ?? []) as ThemeGallerySessionRow[]),
  ];
  const sessionIds = new Set(sessionRows.map((session) => session.id));
  if (sessionIds.size === 0) {
    return {
      themeName: normalizedThemeName,
      totalSessions: 0,
      totalPrints: 0,
    };
  }

  const { data: sales, error: salesError } = await supabase
    .from("pos_sales")
    .select("print_count,notes")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (salesError) {
    throw new Error(`Unable to load theme prints: ${salesError.message}`);
  }

  const saleRows = (sales ?? []) as ThemePrintSaleRow[];
  const totalPrints = saleRows.reduce<number>((total, sale) => {
    const sessionId = sale.notes?.split(" / ", 1)[0]?.trim();
    return sessionId && sessionIds.has(sessionId)
      ? total + (sale.print_count ?? 0)
      : total;
  }, 0);

  return {
    themeName: normalizedThemeName,
    totalSessions: sessionIds.size,
    totalPrints,
  };
}

export async function saveLayoutAsTheme(
  name: string,
  schema: LayoutSchema,
  existingId?: string,
): Promise<string> {
  const { supabase } = await verifyRole(["owner", "admin", "designer"]);
  const id = existingId ?? `LYT-${Date.now()}`;
  const { error } = await supabase.from("layout_schemas").upsert({
    id,
    name,
    status: "draft",
    schema: sanitizeLayoutSchema(schema),
    is_active: false,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Unable to save layout: ${error.message}`);
  return id;
}

export async function setActiveLayout(id: string): Promise<void> {
  const { supabase } = await verifyRole(["owner", "admin", "designer"]);
  // Deactivate all
  const { error: e1 } = await supabase
    .from("layout_schemas")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .neq("id", id);
  if (e1) throw new Error(`Unable to deactivate layouts: ${e1.message}`);
  // Activate the chosen one
  const { error: e2 } = await supabase
    .from("layout_schemas")
    .update({
      is_active: true,
      status: "published",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (e2) throw new Error(`Unable to activate layout: ${e2.message}`);
}

export async function deactivateLayout(id: string): Promise<void> {
  const { supabase } = await verifyRole(["owner", "admin", "designer"]);
  const { error } = await supabase
    .from("layout_schemas")
    .update({
      is_active: false,
      status: "draft",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(`Unable to deactivate layout: ${error.message}`);
}

export async function deleteLayout(id: string): Promise<void> {
  const { supabase } = await verifyRole(["owner", "admin", "designer"]);
  const { error } = await supabase.from("layout_schemas").delete().eq("id", id);
  if (error) throw new Error(`Unable to delete layout: ${error.message}`);
}

export async function getLayoutSchema(): Promise<LayoutSchemaRow | null> {
  const { supabase } = await getAdminContext();
  const { data, error } = await supabase
    .from("layout_schemas")
    .select("id,name,status,schema,is_active,created_at,updated_at")
    .eq("id", "default-photobooth")
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load layout schema: ${error.message}`);
  }

  return data
    ? ({
        ...data,
        schema: normalizeAssetReferences(data.schema) as LayoutSchema,
      } as LayoutSchemaRow)
    : null;
}

export async function publishLayoutSchema(schema: LayoutSchema): Promise<void> {
  const { supabase } = await verifyRole(["owner", "admin", "designer"]);
  const { error } = await supabase.from("layout_schemas").upsert({
    id: "default-photobooth",
    name: "Default Photobooth Layout",
    status: "published",
    schema: sanitizeLayoutSchema(schema),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Unable to publish layout schema: ${error.message}`);
  }
}

export async function publishThemeSchema(schema: ThemeSchema): Promise<void> {
  const { supabase } = await verifyRole(["owner", "admin", "designer"]);
  const { error } = await supabase.from("theme_presets").upsert({
    id: "THM-ACTIVE",
    name: "Active POSKART Theme",
    status: "published",
    schema,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Unable to publish theme schema: ${error.message}`);
  }
}

export async function getThemes(): Promise<ThemePreset[]> {
  const { supabase } = await getAdminContext();
  const { data, error } = await supabase
    .from("theme_presets")
    .select("id,name,status,schema")
    .order("name", { ascending: true });

  const presets = assertSupabaseResult(
    data as ThemePresetRow[] | null,
    error,
    "Unable to load theme presets",
  );

  return presets.map((preset) => ({
    ...preset,
    schema: normalizeAssetReferences(preset.schema) as ThemeSchema,
  }));
}
