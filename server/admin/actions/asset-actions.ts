"use server";

import { createClient } from "@/lib/supabase/server";
import { assertSupabaseResult, type AssetItem, type AssetInput } from "../_shared/admin-types";

async function verifyAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function getAssets(): Promise<AssetItem[]> {
  const { supabase } = await verifyAuth();
  const { data, error } = await supabase
    .from("assets")
    .select("id,name,folder,tag,version,size,url,storage_path")
    .order("folder", { ascending: true });

  return assertSupabaseResult(
    data as AssetItem[] | null,
    error,
    "Unable to load assets",
  );
}

export async function createAsset(values: AssetInput): Promise<void> {
  const { supabase } = await verifyAuth();
  const id = `AST-${crypto.randomUUID()}`;
  const { error } = await supabase.from("assets").insert({
    id,
    name: values.name,
    folder: values.folder,
    tag: values.tag,
    version: values.version || "v1",
    size: values.size,
    url: values.url ?? null,
    storage_path: values.storage_path ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Unable to create asset: ${error.message}`);
}

export async function updateAsset(
  id: string,
  patch: Partial<AssetInput>,
): Promise<void> {
  const { supabase } = await verifyAuth();
  const { error } = await supabase
    .from("assets")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Unable to update asset: ${error.message}`);
}

export async function deleteAsset(
  id: string,
  storagePath?: string | null,
): Promise<void> {
  const { supabase } = await verifyAuth();
  if (storagePath) {
    // best-effort — storage delete failure shouldn't block row deletion
    await supabase.storage.from("builder-assets").remove([storagePath]);
  }
  const { error } = await supabase.from("assets").delete().eq("id", id);
  if (error) throw new Error(`Unable to delete asset: ${error.message}`);
}
