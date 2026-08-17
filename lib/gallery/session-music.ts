import "server-only";

import { normalizeAssetReferences } from "@/lib/assets/asset-url";
import { getPlayableMusicEmbed, type MusicEmbed } from "@/lib/music/embed";
import { resolveMusicTitle } from "@/lib/music/oembed";
import type { SupabaseClient } from "@supabase/supabase-js";

type FrameLayoutRow = {
  frame_layout: unknown;
};

/**
 * Resolves the music player configured on the frame used by a gallery session.
 *
 * `template_id` is resolved at write time by a DB trigger, so renaming a frame
 * later does not break the link. The name lookup is only a fallback for legacy
 * rows the backfill could not match (e.g. duplicate frame names).
 *
 * Returns null when the frame has no player configured.
 */
export async function getSessionMusicEmbed(
  supabase: SupabaseClient,
  session: {
    organization_id?: string | null;
    template_id?: string | null;
    template_name?: string | null;
  },
): Promise<MusicEmbed | null> {
  const organizationId = session.organization_id?.trim();
  if (!organizationId) return null;

  const frameLayout =
    (await selectFrameLayoutById(
      supabase,
      organizationId,
      session.template_id,
    )) ??
    (await selectFrameLayoutByName(
      supabase,
      organizationId,
      session.template_name,
    ));

  if (!frameLayout) return null;

  const layout = normalizeAssetReferences(frameLayout) as {
    music?: unknown;
  } | null;

  const music = getPlayableMusicEmbed(layout?.music);
  if (!music) return null;
  if (music.title) return music;

  // Frames saved before the builder auto-filled titles have none stored.
  // The oEmbed response is cached for a day, so this is cheap.
  return { ...music, title: await resolveMusicTitle(music.url) };
}

async function selectFrameLayoutById(
  supabase: SupabaseClient,
  organizationId: string,
  templateId: string | null | undefined,
) {
  const id = templateId?.trim();
  if (!id) return null;

  const { data, error } = await supabase
    .from("templates")
    .select("frame_layout")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle<FrameLayoutRow>();

  if (error) return null;
  return data?.frame_layout ?? null;
}

async function selectFrameLayoutByName(
  supabase: SupabaseClient,
  organizationId: string,
  templateName: string | null | undefined,
) {
  const name = templateName?.trim();
  if (!name) return null;

  // Template names are free text, so escape LIKE wildcards before matching.
  const namePattern = name.replace(/[\\%_]/g, (char) => `\\${char}`);

  const { data, error } = await supabase
    .from("templates")
    .select("frame_layout")
    .eq("organization_id", organizationId)
    .ilike("name", namePattern)
    .limit(1)
    .maybeSingle<FrameLayoutRow>();

  if (error) return null;
  return data?.frame_layout ?? null;
}
