"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteGalleryAssets } from "@/lib/gallery/storage-provider";

export async function deleteGallerySession(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Get organization membership
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const organizationId = membership?.organization_id;
  if (!organizationId) {
    throw new Error("No organization connection");
  }

  // Verify the session belongs to the user's organization and fetch its storage IDs.
  const { data: session } = await supabase
    .from("gallery_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!session) {
    throw new Error("Session not found or access denied");
  }

  const { data: photos } = await supabase
    .from("gallery_photos")
    .select("storage_provider,provider_public_id,cloudinary_public_id")
    .eq("session_id", sessionId);

  if ((photos ?? []).length > 0) {
    await deleteGalleryAssets(photos ?? []);
  }

  // Delete session from Supabase (cascades to gallery_photos)
  const { error } = await supabase
    .from("gallery_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/gallery");
  return { success: true };
}

export async function queueGalleryPrint(sessionId: string, copies = 1) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const organizationId = membership?.organization_id;
  if (!organizationId) throw new Error("No organization connection");

  const { data: session, error: sessionError } = await supabase
    .from("gallery_sessions")
    .select("id,device_id")
    .eq("id", sessionId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (sessionError || !session?.device_id) {
    throw new Error("Device asal foto tidak ditemukan.");
  }

  const { data: framed, error: photoError } = await supabase
    .from("gallery_photos")
    .select("secure_url")
    .eq("session_id", sessionId)
    .eq("organization_id", organizationId)
    .eq("kind", "framed")
    .order("photo_index", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (photoError || !framed?.secure_url) {
    throw new Error("Foto framed belum tersedia untuk dicetak.");
  }

  const { error } = await supabase.from("device_print_jobs").insert({
    organization_id: organizationId,
    device_id: session.device_id,
    gallery_session_id: session.id,
    source_url: framed.secure_url,
    copies: Math.max(1, Math.min(20, Math.round(copies))),
    requested_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/gallery");
  revalidatePath("/devices");
  return { success: true };
}
