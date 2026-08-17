"use client";

import { Music4, TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  getMusicEmbedHeight,
  MUSIC_EMBED_PROVIDER_LABELS,
  normalizeMusicEmbed,
  type MusicEmbed,
} from "@/lib/music/embed";
import { cn } from "@/lib/utils";

const PROVIDER_HINTS = [
  "Spotify — open.spotify.com/track/...",
  "YouTube — youtube.com/watch?v=...",
  "Apple Music — music.apple.com/id/album/...",
  "SoundCloud — soundcloud.com/artis/lagu",
];

/**
 * Adds an embedded music player to the shared result page (/s/[sessionId]).
 * Only frames with this enabled render a player for the guest.
 */
export function FrameMusicSettings({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (music: MusicEmbed | null) => void;
}) {
  const music = normalizeMusicEmbed(value);
  const hasUrl = music.url.trim().length > 0;
  const isUnsupported = hasUrl && !music.provider;

  const patch = (partial: Partial<MusicEmbed>) => {
    const next = normalizeMusicEmbed({ ...music, ...partial });
    onChange(next.url ? next : null);
  };

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-700 ring-1 ring-violet-100">
            <Music4 className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-zinc-900">
              Music player di halaman hasil
            </div>
            <div className="truncate text-[10px] text-zinc-500">
              Tampil di link galeri /s/... untuk frame ini
            </div>
          </div>
        </div>
        <Switch
          checked={music.enabled}
          disabled={!music.provider}
          onCheckedChange={(enabled) => patch({ enabled })}
          className={cn(!music.provider && "cursor-not-allowed opacity-40")}
          aria-label="Aktifkan music player"
        />
      </div>

      <label className="block text-[11px] font-medium text-zinc-600">
        Link lagu
        <Input
          className="mt-1 text-xs"
          value={music.url}
          placeholder="https://open.spotify.com/track/..."
          spellCheck={false}
          onChange={(event) => patch({ url: event.target.value })}
        />
      </label>

      {isUnsupported ? (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-[10px] leading-4 text-amber-900 ring-1 ring-inset ring-amber-200">
          <TriangleAlert className="mt-px size-3.5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Link belum didukung.</p>
            <ul className="mt-1 space-y-0.5">
              {PROVIDER_HINTS.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {music.provider ? (
        <>
          <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
            <span>Terdeteksi: {MUSIC_EMBED_PROVIDER_LABELS[music.provider]}</span>
            <span>{music.enabled ? "Aktif" : "Nonaktif"}</span>
          </div>

          <label className="block text-[11px] font-medium text-zinc-600">
            Judul (opsional)
            <Input
              className="mt-1 text-xs"
              value={music.title}
              placeholder="Soundtrack momen ini"
              maxLength={80}
              onChange={(event) => patch({ title: event.target.value })}
            />
          </label>

          <label className="flex items-center justify-between gap-3 text-[11px] font-medium text-zinc-600">
            Player compact
            <Switch
              checked={music.compact}
              onCheckedChange={(compact) => patch({ compact })}
              aria-label="Player compact"
            />
          </label>

          {music.embedUrl ? (
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
              <iframe
                key={music.embedUrl}
                src={music.embedUrl}
                title="Pratinjau music player"
                height={getMusicEmbedHeight(music)}
                className="w-full border-0"
                loading="lazy"
                allow="encrypted-media; clipboard-write; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
              />
            </div>
          ) : null}
        </>
      ) : null}

      {hasUrl ? (
        <button
          type="button"
          className="text-[10px] font-semibold text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline"
          onClick={() => onChange(null)}
        >
          Hapus music player
        </button>
      ) : null}
    </section>
  );
}
