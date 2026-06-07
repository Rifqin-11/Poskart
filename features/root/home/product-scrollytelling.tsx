"use client";

import {
  BarChart3,
  CheckCircle2,
  CreditCard,
  Layers3,
  MonitorSmartphone,
  Palette,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const stories = [
  {
    eyebrow: "01 / Design",
    title: "Rancang pengalaman booth secara visual.",
    description:
      "Susun layar pembuka, kamera, preview, dan halaman selesai dari satu builder. Setiap perubahan tersimpan sebagai konfigurasi yang siap dipakai perangkat.",
    points: ["Canvas visual", "Layer terstruktur", "Preview langsung"],
    accent: "rose",
    icon: Layers3,
  },
  {
    eyebrow: "02 / Publish",
    title: "Jaga identitas brand tetap konsisten.",
    description:
      "Kelola warna, tipografi, aset, frame, dan template dari pusat. Publikasikan pengalaman yang tepat untuk setiap booth tanpa konfigurasi ulang di lokasi.",
    points: ["Theme terpusat", "Asset library", "Publish per booth"],
    accent: "orange",
    icon: Palette,
  },
  {
    eyebrow: "03 / Operate",
    title: "Pantau perangkat dan transaksi dari satu layar.",
    description:
      "Lihat status booth, sinkronisasi, paket harga, serta transaksi QRIS yang masuk. Tim operasional mendapat konteks yang dibutuhkan untuk bertindak cepat.",
    points: ["Status perangkat", "Monitoring QRIS", "Riwayat aktivitas"],
    accent: "emerald",
    icon: MonitorSmartphone,
  },
  {
    eyebrow: "04 / Grow",
    title: "Skalakan operasi tanpa menambah kerumitan.",
    description:
      "Gunakan analitik, pengaturan organisasi, dan kontrol akses untuk mengelola lebih banyak perangkat, lokasi, dan anggota tim dalam alur yang sama.",
    points: ["Analitik operasi", "Multi-device", "Akses berbasis peran"],
    accent: "sky",
    icon: BarChart3,
  },
] as const;

export function ProductScrollytelling() {
  const [activeStory, setActiveStory] = useState(0);
  const storyRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visibleEntry) {
          return;
        }

        const index = Number(
          (visibleEntry.target as HTMLElement).dataset.storyIndex,
        );

        if (Number.isFinite(index)) {
          setActiveStory(index);
        }
      },
      {
        rootMargin: "-28% 0px -42% 0px",
        threshold: [0.2, 0.45, 0.7],
      },
    );

    const currentStoryRefs = storyRefs.current;
    currentStoryRefs.forEach((element) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      currentStoryRefs.forEach((element) => {
        if (element) {
          observer.unobserve(element);
        }
      });
    };
  }, []);

  return (
    <section
      id="platform"
      className="relative border-y border-white/10 bg-zinc-950 text-white"
    >
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
            <Sparkles className="size-3.5 text-rose-300" />
            Satu alur, dari ide hingga operasi
          </div>
          <h2 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            Scroll untuk melihat cara POSKART bekerja.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
            Setiap bagian platform terhubung, sehingga perubahan desain,
            perangkat, dan transaksi tetap berada dalam satu konteks operasi.
          </p>
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-[0.86fr_1.14fr] lg:gap-20">
          <div className="space-y-6 lg:space-y-0">
            {stories.map((story, index) => {
              const Icon = story.icon;

              return (
                <article
                  key={story.title}
                  ref={(element) => {
                    storyRefs.current[index] = element;
                  }}
                  data-story-index={index}
                  className="flex min-h-0 scroll-mt-32 flex-col justify-center rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition-colors lg:min-h-[72vh] lg:border-0 lg:bg-transparent lg:p-0"
                >
                  <div
                    className={cn(
                      "mb-5 grid size-11 place-items-center rounded-2xl border transition-all lg:hidden",
                      storyTone(story.accent, true),
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <p
                    className={cn(
                      "text-xs font-semibold uppercase tracking-[0.22em]",
                      storyTone(story.accent, false),
                    )}
                  >
                    {story.eyebrow}
                  </p>
                  <h3 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                    {story.title}
                  </h3>
                  <p className="mt-5 max-w-xl text-base leading-8 text-zinc-400">
                    {story.description}
                  </p>
                  <div className="mt-7 flex flex-wrap gap-2">
                    {story.points.map((point) => (
                      <span
                        key={point}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300"
                      >
                        <CheckCircle2 className="size-3.5 text-emerald-400" />
                        {point}
                      </span>
                    ))}
                  </div>
                  <div className="mt-8 lg:hidden">
                    <ProductScene activeStory={index} compact />
                  </div>
                </article>
              );
            })}
          </div>

          <div className="relative hidden lg:block">
            <div className="sticky top-24 flex h-[calc(100vh-7rem)] items-center">
              <ProductScene activeStory={activeStory} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductScene({
  activeStory,
  compact = false,
}: {
  activeStory: number;
  compact?: boolean;
}) {
  const story = stories[activeStory];
  const Icon = story.icon;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900 shadow-2xl shadow-black/40",
        compact ? "min-h-[340px]" : "min-h-[560px]",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 opacity-40 transition-colors duration-700",
          sceneGradient(story.accent),
        )}
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      <div className="relative flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-rose-400" />
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="size-2.5 rounded-full bg-emerald-400" />
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
          POSKART / {String(activeStory + 1).padStart(2, "0")}
        </span>
      </div>

      <div className={cn("relative p-5 sm:p-8", compact ? "pb-8" : "p-10")}>
        <div className="flex items-center justify-between">
          <div
            className={cn(
              "grid size-12 place-items-center rounded-2xl border",
              storyTone(story.accent, true),
            )}
          >
            <Icon className="size-5" />
          </div>
          <div className="flex gap-1.5">
            {stories.map((item, index) => (
              <span
                key={item.eyebrow}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  index === activeStory
                    ? "w-8 bg-white"
                    : "w-1.5 bg-white/20",
                )}
              />
            ))}
          </div>
        </div>

        <div
          key={story.title}
          className="mt-10 animate-[scrolly-enter_500ms_ease-out]"
        >
          <SceneContent activeStory={activeStory} compact={compact} />
        </div>
      </div>
    </div>
  );
}

function SceneContent({
  activeStory,
  compact,
}: {
  activeStory: number;
  compact: boolean;
}) {
  if (activeStory === 0) {
    return (
      <div className="grid gap-4 sm:grid-cols-[0.68fr_1fr]">
        <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
          {["Judul", "Area kamera", "Pilihan layout", "Tombol mulai"].map(
            (layer, index) => (
              <div
                key={layer}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm",
                  index === 1
                    ? "bg-white text-zinc-950"
                    : "bg-white/5 text-zinc-400",
                )}
              >
                <span className="font-mono text-xs opacity-60">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {layer}
              </div>
            ),
          )}
        </div>
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border border-white/10 bg-white p-5 text-zinc-950",
            compact ? "min-h-52" : "min-h-80",
          )}
        >
          <div className="absolute inset-x-5 top-5 h-8 rounded-lg bg-zinc-100" />
          <div className="absolute inset-x-8 top-20 bottom-20 rounded-2xl border-2 border-dashed border-rose-300 bg-rose-50">
            <div className="grid h-full place-items-center">
              <div className="text-center">
                <Sparkles className="mx-auto size-8 text-rose-500" />
                <p className="mt-2 text-sm font-semibold">Camera preview</p>
              </div>
            </div>
          </div>
          <div className="absolute inset-x-12 bottom-6 h-10 rounded-full bg-zinc-950" />
        </div>
      </div>
    );
  }

  if (activeStory === 1) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {["#E11D48", "#FB923C", "#18181B"].map((color) => (
            <div
              key={color}
              className="rounded-2xl border border-white/10 bg-black/20 p-3"
            >
              <div
                className="aspect-square rounded-xl"
                style={{ backgroundColor: color }}
              />
              <p className="mt-3 font-mono text-[10px] text-zinc-500">
                {color}
              </p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {["Event Series", "Everyday Booth"].map((name, index) => (
            <div
              key={name}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div
                className={cn(
                  "aspect-[4/3] rounded-xl",
                  index === 0
                    ? "bg-gradient-to-br from-rose-500 to-orange-300"
                    : "bg-gradient-to-br from-zinc-200 to-zinc-500",
                )}
              />
              <p className="mt-3 text-sm font-medium">{name}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeStory === 2) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <StatusCard label="Perangkat online" value="Aktif" />
          <StatusCard label="Sinkronisasi" value="Terkini" />
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Alur transaksi</p>
              <p className="mt-1 text-xs text-zinc-500">
                Status pembayaran dan cetak
              </p>
            </div>
            <CreditCard className="size-5 text-emerald-400" />
          </div>
          {["Pembayaran diterima", "Sesi diproses", "Hasil siap dicetak"].map(
            (item, index) => (
              <div
                key={item}
                className="flex items-center gap-3 border-t border-white/10 py-3 text-sm first:border-0"
              >
                <CheckCircle2 className="size-4 text-emerald-400" />
                <span className="flex-1 text-zinc-300">{item}</span>
                <span className="font-mono text-[10px] text-zinc-600">
                  0{index + 1}
                </span>
              </div>
            ),
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold">Aktivitas booth</p>
            <p className="mt-1 text-xs text-zinc-500">Ringkasan lintas lokasi</p>
          </div>
          <span className="text-xs text-emerald-400">Terpantau</span>
        </div>
        <div className={cn("mt-8 flex items-end gap-2", compact ? "h-24" : "h-40")}>
          {[38, 52, 45, 68, 59, 82, 72, 94].map((height, index) => (
            <span
              key={index}
              className="flex-1 rounded-t-lg bg-gradient-to-t from-sky-600 to-cyan-300"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {["Tim", "Lokasi", "Perangkat"].map((label) => (
          <div
            key={label}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <p className="text-xs text-zinc-500">{label}</p>
            <p className="mt-2 text-sm font-semibold">Terkelola</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <div className="mt-3 flex items-center gap-2 text-sm font-semibold">
        <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.8)]" />
        {value}
      </div>
    </div>
  );
}

function storyTone(
  accent: (typeof stories)[number]["accent"],
  background: boolean,
) {
  const tones = {
    rose: background
      ? "border-rose-400/25 bg-rose-400/10 text-rose-300"
      : "text-rose-300",
    orange: background
      ? "border-orange-400/25 bg-orange-400/10 text-orange-300"
      : "text-orange-300",
    emerald: background
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
      : "text-emerald-300",
    sky: background
      ? "border-sky-400/25 bg-sky-400/10 text-sky-300"
      : "text-sky-300",
  };

  return tones[accent];
}

function sceneGradient(accent: (typeof stories)[number]["accent"]) {
  const gradients = {
    rose:
      "bg-[radial-gradient(circle_at_20%_20%,rgba(244,63,94,0.42),transparent_42%)]",
    orange:
      "bg-[radial-gradient(circle_at_80%_20%,rgba(251,146,60,0.42),transparent_42%)]",
    emerald:
      "bg-[radial-gradient(circle_at_20%_80%,rgba(52,211,153,0.35),transparent_42%)]",
    sky:
      "bg-[radial-gradient(circle_at_80%_80%,rgba(56,189,248,0.38),transparent_42%)]",
  };

  return gradients[accent];
}
