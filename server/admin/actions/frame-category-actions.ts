"use server";

import { randomUUID } from "node:crypto";
import { getAdminContext, verifyRole } from "@/server/admin/context";
import type { FrameCategory } from "@/types/template";

type FrameCategoryRow = {
  id: string;
  name: string;
  display_order: number;
};

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function assertValidName(name: string) {
  if (name.length < 1 || name.length > 64) {
    throw new Error("Category name must contain 1 to 64 characters.");
  }
}

function mapCategory(row: FrameCategoryRow): FrameCategory {
  return {
    id: row.id,
    name: row.name,
    displayOrder: row.display_order,
  };
}

export async function getFrameCategories(): Promise<FrameCategory[]> {
  const { supabase } = await getAdminContext();
  const { data, error } = await supabase
    .from("frame_categories")
    .select("id,name,display_order")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error)
    throw new Error(`Unable to load frame categories: ${error.message}`);
  return ((data ?? []) as FrameCategoryRow[]).map(mapCategory);
}

export async function createFrameCategory(
  name: string,
): Promise<FrameCategory> {
  const { supabase, organizationId } = await verifyRole([
    "owner",
    "admin",
    "designer",
  ]);
  const normalizedName = normalizeName(name);
  assertValidName(normalizedName);

  const { data: lastCategory, error: orderError } = await supabase
    .from("frame_categories")
    .select("display_order")
    .eq("organization_id", organizationId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (orderError) {
    throw new Error(`Unable to prepare frame category: ${orderError.message}`);
  }

  const { data, error } = await supabase
    .from("frame_categories")
    .insert({
      id: `FRC-${randomUUID()}`,
      organization_id: organizationId,
      name: normalizedName,
      display_order: (lastCategory?.display_order ?? -1) + 1,
    })
    .select("id,name,display_order")
    .single();
  if (error || !data) {
    throw new Error(
      `Unable to create frame category: ${error?.message ?? "unknown error"}`,
    );
  }
  return mapCategory(data as FrameCategoryRow);
}

export async function updateFrameCategory(
  id: string,
  name: string,
): Promise<void> {
  const { supabase } = await verifyRole(["owner", "admin", "designer"]);
  const normalizedName = normalizeName(name);
  assertValidName(normalizedName);
  const { error } = await supabase
    .from("frame_categories")
    .update({ name: normalizedName, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error)
    throw new Error(`Unable to update frame category: ${error.message}`);
}

export async function deleteFrameCategory(id: string): Promise<void> {
  const { supabase } = await verifyRole(["owner", "admin", "designer"]);
  const { error } = await supabase
    .from("frame_categories")
    .delete()
    .eq("id", id);
  if (error)
    throw new Error(`Unable to delete frame category: ${error.message}`);
}

export async function reorderFrameCategories(
  categoryIds: string[],
): Promise<void> {
  if (categoryIds.length === 0) return;

  const { supabase } = await verifyRole(["owner", "admin", "designer"]);
  const { error } = await supabase.rpc("reorder_frame_categories", {
    category_ids: categoryIds,
  });
  if (error) {
    throw new Error(`Unable to reorder frame categories: ${error.message}`);
  }
}
