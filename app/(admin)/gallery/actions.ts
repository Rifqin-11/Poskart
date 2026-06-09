"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteCloudinaryAssets } from "@/lib/cloudinary/server";

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

  // Verify the session belongs to the user's organization and fetch its photos' cloudinary public IDs
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
    .select("cloudinary_public_id")
    .eq("session_id", sessionId);

  const publicIds = (photos ?? []).map((p) => p.cloudinary_public_id);

  // Delete from Cloudinary first
  if (publicIds.length > 0) {
    await deleteCloudinaryAssets(publicIds);
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
