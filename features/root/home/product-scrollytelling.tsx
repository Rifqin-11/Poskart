"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Layers3,
  MonitorSmartphone,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";

const stories = [
  {
    step: 1,
    eyebrow: "01 / Design",
    title: "Rancang pengalaman booth secara visual.",
    description:
      "Susun layar pembuka, kamera, preview, dan halaman selesai dari satu builder. Setiap perubahan tersimpan sebagai konfigurasi yang siap dipakai perangkat.",
    points: ["Canvas visual", "Layer terstruktur", "Preview langsung"],
    accentColor: "#f43f5e",
    accentColorClass: "text-rose-400",
    accentBorderClass: "border-rose-500",
    accentBgClass: "bg-rose-500/10",
    sceneLabel: "POSKART / 01",
    sceneBg: "from-rose-950/60 via-zinc-950 to-zinc-950",
    icon: Layers3,
    sceneContent: <SceneDesign />,
  },
  {
    step: 2,
    eyebrow: "02 / Publish",
    title: "Jaga identitas brand tetap konsisten.",
    description:
      "Kelola warna, tipografi, aset, frame, dan template dari pusat. Publikasikan pengalaman yang tepat untuk setiap booth tanpa konfigurasi ulang di lokasi.",
    points: ["Theme terpusat", "Asset library", "Publish per booth"],
    accentColor: "#f97316",
    accentColorClass: "text-orange-400",
    accentBorderClass: "border-orange-500",
    accentBgClass: "bg-orange-500/10",
    sceneLabel: "POSKART / 02",
    sceneBg: "from-orange-950/60 via-zinc-950 to-zinc-950",
    icon: Palette,
    sceneContent: <ScenePublish />,
  },
  {
    step: 3,
    eyebrow: "03 / Operate",
    title: "Pantau perangkat dan transaksi dari satu layar.",
    description:
      "Lihat status booth, sinkronisasi, paket harga, serta transaksi QRIS yang masuk. Tim operasional mendapat konteks yang dibutuhkan untuk bertindak cepat.",
    points: ["Status perangkat", "Monitoring QRIS", "Riwayat aktivitas"],
    accentColor: "#10b981",
    accentColorClass: "text-emerald-400",
    accentBorderClass: "border-emerald-500",
    accentBgClass: "bg-emerald-500/10",
    sceneLabel: "POSKART / 03",
    sceneBg: "from-emerald-950/60 via-zinc-950 to-zinc-950",
    icon: MonitorSmartphone,
    sceneContent: <SceneOperate />,
  },
  {
    step: 4,
    eyebrow: "04 / Grow",
    title: "Skalakan operasi tanpa menambah kerumitan.",
    description:
      "Gunakan analitik, pengaturan organisasi, dan kontrol akses untuk mengelola lebih banyak perangkat, lokasi, dan anggota tim dalam alur yang sama.",
    points: ["Analitik operasi", "Multi-device", "Akses berbasis peran"],
    accentColor: "#38bdf8",
    accentColorClass: "text-sky-400",
    accentBorderClass: "border-sky-500",
    accentBgClass: "bg-sky-500/10",
    sceneLabel: "POSKART / 04",
    sceneBg: "from-sky-950/60 via-zinc-950 to-zinc-950",
    icon: BarChart3,
    sceneContent: <SceneGrow />,
  },
] as const;

type Story = (typeof stories)[number];

export function ProductScrollytelling() {
  const sectionRef = useRef<HTMLElement>(null);
  const storyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    storyRefs.current.forEach((el, index) => {
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveStep(index + 1);
        },
        {
          root: null,
          rootMargin: "-40% 0px -40% 0px",
          threshold: 0,
        },
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const activeStory = stories.find((s) => s.step === activeStep) ?? stories[0];

  return (
    <section
      ref={sectionRef}
      id="platform"
      className="bg-zinc-950 text-white"
    >
      {/* Section header */}
      <div className="mx-auto max-w-7xl px-4 pt-20 pb-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
          Satu alur, dari ide hingga operasi
        </p>
        <h2 className="mt-5 max-w-3xl text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
          Scroll untuk melihat cara POSKART bekerja.
        </h2>
        <p className="mt-4 max-w-xl text-base leading-8 text-zinc-400">
          Setiap bagian platform terhubung, sehingga perubahan desain, perangkat,
          dan transaksi tetap berada dalam satu konteks operasi.
        </p>

        {/* Clickable progress bar */}
        <div className="mt-8 flex gap-3">
          {stories.map((story) => (
            <button
              key={story.step}
              onClick={() => {
                storyRefs.current[story.step - 1]?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              }}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-500",
                activeStep === story.step
                  ? story.accentBgClass.replace("/10", "") + " opacity-100"
                  : "bg-zinc-800",
              )}
              style={
                activeStep === story.step
                  ? { backgroundColor: story.accentColor }
                  : {}
              }
              aria-label={`Go to step ${story.step}`}
            />
          ))}
        </div>
      </div>

      {/* Scrollytelling body — sticky right panel */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-[1fr_0.95fr] lg:gap-16">
          {/* Left — story list */}
          <div className="space-y-0 py-8 lg:py-16">
            {stories.map((story, index) => {
              const isActive = activeStep === story.step;
              const Icon = story.icon;
              return (
                <div
                  key={story.step}
                  ref={(el) => {
                    storyRefs.current[index] = el;
                  }}
                  className={cn(
                    "relative min-h-[55vh] border-l-2 py-10 pl-8 pr-4 transition-all duration-500 lg:min-h-[70vh]",
                    isActive
                      ? story.accentBorderClass
                      : "border-zinc-800/60",
                    !isActive && "opacity-45 blur-[0.2px]",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "grid size-9 place-items-center rounded-xl transition-colors duration-500",
                        isActive ? story.accentBgClass : "bg-zinc-800",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-4 transition-colors duration-500",
                          isActive ? story.accentColorClass : "text-zinc-500",
                        )}
                      />
                    </div>
                    <p
                      className={cn(
                        "text-xs font-semibold uppercase tracking-[0.22em] transition-colors duration-500",
                        isActive ? story.accentColorClass : "text-zinc-600",
                      )}
                    >
                      {story.eyebrow}
                    </p>
                  </div>
                  <h3
                    className={cn(
                      "mt-5 text-2xl font-semibold tracking-[-0.03em] transition-colors duration-500 sm:text-3xl",
                      isActive ? "text-white" : "text-zinc-400",
                    )}
                  >
                    {story.title}
                  </h3>
                  <p className="mt-4 max-w-lg text-base leading-8 text-zinc-500">
                    {story.description}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {story.points.map((point) => (
                      <span
                        key={point}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-500",
                          isActive
                            ? `border-zinc-700 ${story.accentColorClass}`
                            : "border-zinc-800 text-zinc-600",
                        )}
                      >
                        <CheckCircle2 className="size-3.5" />
                        {point}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right — sticky scene panel */}
          <div className="hidden lg:block">
            <div className="sticky top-24 py-16">
              <ScenePanel story={activeStory} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Scene Panel ──────────────────────────────────────────────────────────────

function ScenePanel({ story }: { story: Story }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl bg-gradient-to-b border border-white/10 transition-all duration-700",
        story.sceneBg,
      )}
      style={{ minHeight: 520 }}
    >
      {/* Window chrome */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-rose-500/60" />
          <span className="size-2.5 rounded-full bg-amber-500/60" />
          <span className="size-2.5 rounded-full bg-emerald-500/60" />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          {story.sceneLabel}
        </span>
        {/* Progress dots in scene */}
        <div className="flex gap-1">
          {stories.map((s) => (
            <span
              key={s.step}
              className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: s.step === story.step ? 20 : 6,
                backgroundColor:
                  s.step === story.step ? story.accentColor : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>
      </div>
      {/* Scene body */}
      <div className="flex items-center justify-center p-6" style={{ minHeight: 460 }}>
        {story.sceneContent}
      </div>
    </div>
  );
}

// ── Scene Content Components ──────────────────────────────────────────────────

function SceneDesign() {
  return (
    <div className="w-full space-y-3">
      {/* Canvas header */}
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <span className="text-xs text-zinc-400">Canvas · Layar Pembuka</span>
        <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-medium text-rose-400">
          Editing
        </span>
      </div>
      {/* Canvas area */}
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-zinc-900" style={{ height: 280 }}>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:28px_28px]" />
        <div className="absolute top-6 inset-x-6 h-8 rounded-lg border border-dashed border-zinc-700 bg-zinc-800/50 flex items-center px-3">
          <span className="text-[10px] text-zinc-600 font-mono">Header</span>
        </div>
        <div className="absolute inset-x-6 rounded-xl border-2 border-rose-500/50 bg-rose-500/5 flex items-center justify-center" style={{ top: 52, bottom: 52 }}>
          <div className="text-center">
            <div className="mx-auto size-10 rounded-full border-2 border-rose-500/70 flex items-center justify-center">
              <div className="size-5 rounded-full bg-rose-500/60" />
            </div>
            <p className="mt-2 text-[11px] text-rose-400 font-medium">Area kamera</p>
          </div>
        </div>
        <div className="absolute bottom-6 inset-x-6 h-8 rounded-lg border border-dashed border-zinc-700 bg-zinc-800/50 flex items-center px-3">
          <span className="text-[10px] text-zinc-600 font-mono">Footer</span>
        </div>
      </div>
      {/* Layer list */}
      <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/5 p-3">
        {["Header", "Area kamera", "Pilihan layout", "Tombol mulai"].map(
          (layer, i) => (
            <div
              key={layer}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-xs",
                i === 1 ? "bg-rose-500/15 text-rose-300" : "text-zinc-500",
              )}
            >
              <span className="font-mono text-[10px] opacity-50">{String(i + 1).padStart(2, "0")}</span>
              <span>{layer}</span>
              {i === 1 && <span className="ml-auto rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-400">Aktif</span>}
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function ScenePublish() {
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <span className="text-xs text-zinc-400">Brand Identity</span>
        <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-medium text-orange-400">
          Published
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2 rounded-xl border border-white/10 bg-white/5 p-4">
        {["#E11D48", "#FB923C", "#18181B", "#F4F4F5", "#FFFFFF"].map((c) => (
          <div key={c} className="space-y-1.5">
            <div className="aspect-square rounded-lg border border-white/10" style={{ backgroundColor: c }} />
            <p className="font-mono text-[8px] text-zinc-600 text-center">{c.slice(1)}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Typography</p>
        <p className="text-4xl font-bold text-white tracking-tight">Aa</p>
        <p className="mt-1 text-sm text-zinc-400 font-medium">POSKART Display</p>
        <p className="text-xs text-zinc-600">Regular · Medium · Semibold</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Event Series", from: "#E11D48", to: "#FB923C" },
          { label: "Everyday", from: "#18181B", to: "#52525B" },
          { label: "Minimal", from: "#F4F4F5", to: "#D4D4D8" },
        ].map((t) => (
          <div key={t.label} className="rounded-xl border border-white/10 bg-white/5 p-2">
            <div className="aspect-[3/4] rounded-lg" style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }} />
            <p className="mt-1.5 text-center text-[9px] text-zinc-500">{t.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SceneOperate() {
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <span className="text-xs text-zinc-400">Operations Dashboard</span>
        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-[10px] uppercase tracking-widest text-zinc-600">Perangkat aktif</p>
        <div className="mt-1 flex items-end gap-2">
          <span className="text-5xl font-black tracking-tight text-white">4</span>
          <span className="mb-1 text-xs text-zinc-500">dari 4 terdaftar</span>
        </div>
        <div className="mt-3 flex gap-2">
          {["Booth A", "Booth B", "Booth C", "Booth D"].map((b) => (
            <div key={b} className="flex-1 rounded-lg bg-emerald-500/10 px-1 py-2 text-center text-[9px] font-medium text-emerald-400">
              {b}
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-0">
        <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3">Alur transaksi</p>
        {["Pembayaran diterima", "Sesi diproses", "Hasil siap dicetak"].map((item, i) => (
          <div key={item} className="flex items-center gap-3 border-t border-white/5 py-2.5 first:border-0 text-sm">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
            <span className="flex-1 text-zinc-300 text-xs">{item}</span>
            <span className="font-mono text-[10px] text-zinc-700">0{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SceneGrow() {
  const bars = [38, 52, 45, 68, 59, 82, 72, 94];
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <span className="text-xs text-zinc-400">Analytics · 7 hari terakhir</span>
        <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-medium text-sky-400">
          ↑ Tren naik
        </span>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600">Sesi booth</p>
            <p className="mt-1 text-4xl font-black tracking-tight text-white">
              +94<span className="text-xl text-zinc-600">%</span>
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-end gap-1.5" style={{ height: 80 }}>
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm"
              style={{
                height: `${h}%`,
                backgroundColor: i === bars.length - 1 ? "#38bdf8" : "rgba(56,189,248,0.2)",
              }}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[{ label: "Tim aktif", value: "12" }, { label: "Lokasi", value: "5" }, { label: "Perangkat", value: "4" }].map(
          (stat) => (
            <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
              <p className="text-2xl font-black tracking-tight text-white">{stat.value}</p>
              <p className="mt-1 text-[10px] text-zinc-600">{stat.label}</p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
