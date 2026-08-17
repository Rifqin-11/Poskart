import { Music4 } from "lucide-react";
import {
  getMusicEmbedHeight,
  MUSIC_EMBED_PROVIDER_LABELS,
  type MusicEmbed,
} from "@/lib/music/embed";

/**
 * Embedded player on the shared result page. Rendered only when the frame used
 * by the session has a music link configured in the frame builder.
 */
export function GalleryMusicPlayer({ music }: { music: MusicEmbed }) {
  if (!music.embedUrl || !music.provider) return null;

  return (
    <section className="rounded-2xl border border-black/5 bg-zinc-50/50 p-3 md:p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-zinc-900 ring-1 ring-black/5">
          <Music4 className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900">
            {music.title || "Soundtrack momen ini"}
          </p>
          <p className="text-xs text-zinc-500">
            Diputar via {MUSIC_EMBED_PROVIDER_LABELS[music.provider]}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white">
        <iframe
          src={music.embedUrl}
          title={music.title || "Music player"}
          height={getMusicEmbedHeight(music)}
          className="w-full border-0"
          loading="lazy"
          allow="autoplay; encrypted-media; clipboard-write; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    </section>
  );
}
