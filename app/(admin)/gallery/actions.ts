"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteGalleryAssets } from "@/lib/gallery/storage-provider";
import { getSiteUrl } from "@/lib/auth/site-url";
import { randomBytes } from "node:crypto";

const MAX_SHARED_GALLERY_SESSIONS = 250;

function createSharedGalleryToken(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36) || "gallery";
  const suffix = randomBytes(5).toString("base64url").replace(/[-_]/g, "").slice(0, 7);
  return `${slug}-${suffix}`;
}

async function getGalleryActionContext() {
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

  if (!membership?.organization_id) {
    throw new Error("No organization connection");
  }

  return {
    supabase,
    user,
    organizationId: membership.organization_id,
  };
}

export async function createSharedGallery(input: {
  name: string;
  sessionIds: string[];
}) {
  const { supabase, user, organizationId } = await getGalleryActionContext();
  const name = input.name.trim();
  const sessionIds = [
    ...new Set(input.sessionIds.map((id) => id.trim())),
  ].filter(Boolean);

  if (!name) throw new Error("Gallery name is required.");
  if (name.length > 100) {
    throw new Error("Gallery name cannot exceed 100 characters.");
  }
  if (sessionIds.length === 0) {
    throw new Error("Select at least one gallery session.");
  }
  if (sessionIds.length > MAX_SHARED_GALLERY_SESSIONS) {
    throw new Error(
      `A shared gallery can contain up to ${MAX_SHARED_GALLERY_SESSIONS} sessions.`,
    );
  }

  const { data: ownedSessions, error: sessionsError } = await supabase
    .from("gallery_sessions")
    .select("id")
    .eq("organization_id", organizationId)
    .in("id", sessionIds);

  if (sessionsError) throw new Error(sessionsError.message);

  const ownedSessionIds = new Set(
    (ownedSessions ?? []).map((session) => session.id),
  );
  if (
    ownedSessionIds.size !== sessionIds.length ||
    sessionIds.some((sessionId) => !ownedSessionIds.has(sessionId))
  ) {
    throw new Error("One or more selected sessions are no longer available.");
  }

  const { data: sharedGallery, error: galleryError } = await supabase
    .from("shared_galleries")
    .insert({
    organization_id: organizationId,
    name,
      public_token: createSharedGalleryToken(name),
      created_by: user.id,
    })
    .select("id,name,public_token,created_at")
    .single();

  if (galleryError || !sharedGallery) {
    throw new Error(
      galleryError?.message ?? "Unable to create shared gallery.",
    );
  }

  const { error: itemsError } = await supabase
    .from("shared_gallery_sessions")
    .insert(
      sessionIds.map((gallerySessionId, position) => ({
        shared_gallery_id: sharedGallery.id,
        gallery_session_id: gallerySessionId,
        position,
      })),
    );

  if (itemsError) {
    await supabase
      .from("shared_galleries")
      .delete()
      .eq("id", sharedGallery.id)
      .eq("organization_id", organizationId);
    throw new Error(itemsError.message);
  }

  const publicUrl = `${await getSiteUrl()}/g/${sharedGallery.public_token}`;
  revalidatePath("/gallery");

  return {
    id: sharedGallery.id,
    name: sharedGallery.name,
    publicToken: sharedGallery.public_token,
    publicUrl,
    sessionCount: sessionIds.length,
    sessionIds,
    createdAt: sharedGallery.created_at,
  };
}

export async function deleteSharedGallery(sharedGalleryId: string) {
  const { supabase, organizationId } = await getGalleryActionContext();
  if (!sharedGalleryId.trim()) throw new Error("Shared gallery is required.");

  const { data, error } = await supabase
    .from("shared_galleries")
    .delete()
    .eq("id", sharedGalleryId)
    .eq("organization_id", organizationId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Shared gallery not found or access denied.");

  revalidatePath("/gallery");
  return { success: true };
}

export async function updateSharedGallery(input: {
  id: string;
  name: string;
  sessionIds: string[];
}) {
  const { supabase, organizationId } = await getGalleryActionContext();
  const name = input.name.trim();
  const sessionIds = [...new Set(input.sessionIds.map((id) => id.trim()))].filter(Boolean);
  if (!input.id.trim()) throw new Error("Shared gallery is required.");
  if (!name) throw new Error("Gallery name is required.");
  if (name.length > 100) throw new Error("Gallery name cannot exceed 100 characters.");
  if (sessionIds.length === 0) throw new Error("Select at least one gallery session.");
  if (sessionIds.length > MAX_SHARED_GALLERY_SESSIONS) {
    throw new Error(`A shared gallery can contain up to ${MAX_SHARED_GALLERY_SESSIONS} sessions.`);
  }

  const { data: ownedSessions, error: sessionsError } = await supabase
    .from("gallery_sessions")
    .select("id")
    .eq("organization_id", organizationId)
    .in("id", sessionIds);
  if (sessionsError) throw new Error(sessionsError.message);
  const ownedIds = new Set((ownedSessions ?? []).map((session) => session.id));
  if (ownedIds.size !== sessionIds.length || sessionIds.some((id) => !ownedIds.has(id))) {
    throw new Error("One or more selected sessions are no longer available.");
  }

  const { data: gallery, error: galleryError } = await supabase
    .from("shared_galleries")
    .update({ name })
    .eq("id", input.id)
    .eq("organization_id", organizationId)
    .select("id,name,public_token,created_at")
    .maybeSingle();
  if (galleryError) throw new Error(galleryError.message);
  if (!gallery) throw new Error("Shared gallery not found or access denied.");

  const { error: deleteError } = await supabase
    .from("shared_gallery_sessions")
    .delete()
    .eq("shared_gallery_id", gallery.id);
  if (deleteError) throw new Error(deleteError.message);
  const { error: insertError } = await supabase
    .from("shared_gallery_sessions")
    .insert(sessionIds.map((gallerySessionId, position) => ({
      shared_gallery_id: gallery.id,
      gallery_session_id: gallerySessionId,
      position,
    })));
  if (insertError) throw new Error(insertError.message);

  revalidatePath("/gallery");
  revalidatePath(`/g/${gallery.public_token}`);
  return {
    id: gallery.id,
    name: gallery.name,
    publicToken: gallery.public_token,
    publicUrl: `${await getSiteUrl()}/g/${gallery.public_token}`,
    sessionCount: sessionIds.length,
    sessionIds,
    createdAt: gallery.created_at,
  };
}

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
    throw new Error("Source device not found.");
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
    throw new Error("Framed photo not yet available for printing.");
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
