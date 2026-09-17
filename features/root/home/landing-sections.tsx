"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CreditCard,
  MonitorCog,
  MonitorCheck,
  Settings2,
  ScanLine,
  Share2,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import { landingAssets } from "@/features/root/home/landing-content";
import { useNearViewport } from "@/features/root/home/use-near-viewport";

gsap.registerPlugin(ScrollTrigger);

type ProductPreviewKey = "admin" | "booth" | "settings";

const productPreviews: Record<
  ProductPreviewKey,
  {
    label: string;
    description: string;
    image: string | null;
    imageAlt: string;
    icon: LucideIcon;
  }
> = {
  admin: {
    label: "Admin Web",
    description:
      "Ubah tema, frame, dan konfigurasi dari browser tanpa menghentikan sesi di booth.",
    image: landingAssets.hero.src,
    imageAlt: landingAssets.hero.alt,
    icon: MonitorCheck,
  },
  booth: {
    label: "Aplikasi Booth",
    description:
      "Aplikasi Flutter tetap menjalankan pembayaran, kamera, preview, dan cetak di lokasi.",
    image: landingAssets.boothApp.src,
    imageAlt: landingAssets.boothApp.alt,
    icon: MonitorCog,
  },
  settings: {
    label: "Settings Aplikasi",
    description:
      "Pengaturan perangkat tetap tersedia di booth, sementara perubahan brand dikelola dari Admin Web.",
    image: landingAssets.AppSettings.src,
    imageAlt: "Placeholder screenshot pengaturan aplikasi Flutter POSKART",
    icon: Settings2,
  },
};

const proofPoints = [
  { value: "Di belakang layar", label: "tema dan frame bisa diperbarui" },
  { value: "Di lokasi", label: "booth tetap melayani pengunjung" },
  { value: "Tersinkron", label: "perubahan siap dipakai saat sesi berikutnya" },
];

export function ProductShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const previewRefs = useRef<(HTMLDivElement | null)[]>([]);
  const previousPreviewRef = useRef(0);
  const [activePreview, setActivePreview] = useState<ProductPreviewKey>("admin");
  const preview = productPreviews[activePreview];
  const previewKeys = Object.keys(productPreviews) as ProductPreviewKey[];
  const activePreviewIndex = previewKeys.indexOf(activePreview);
  const nearViewport = useNearViewport(sectionRef);

  useLayoutEffect(() => {
    const current = previewRefs.current[activePreviewIndex];
    const previous = previewRefs.current[previousPreviewRef.current];
    if (!current) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      gsap.set(previewRefs.current, { autoAlpha: 0 });
      gsap.set(current, { autoAlpha: 1 });
      previousPreviewRef.current = activePreviewIndex;
      return;
    }

    const direction = activePreviewIndex >= previousPreviewRef.current ? 1 : -1;
    const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
    if (previous && previous !== current) {
      timeline.to(previous, {
        autoAlpha: 0,
        x: -22 * direction,
        scale: 0.98,
        duration: 0.3,
      }, 0);
    }
    timeline.fromTo(
      current,
      { autoAlpha: 0, x: 36 * direction, scale: 0.965, filter: "blur(7px)" },
      { autoAlpha: 1, x: 0, scale: 1, filter: "blur(0px)", duration: 0.62, clearProps: "transform,filter" },
      0.08,
    );
    previousPreviewRef.current = activePreviewIndex;

    return () => {
      timeline.kill();
    };
  }, [activePreviewIndex]);

  useLayoutEffect(() => {
    if (!nearViewport) return;
    if (!sectionRef.current) return;
    const context = gsap.context(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      gsap.from("[data-product-heading] > *", {
        autoAlpha: 0,
        y: 34,
        duration: 0.72,
        stagger: 0.09,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 72%", once: true },
      });
    }, sectionRef);
    return () => context.revert();
  }, [nearViewport]);

  return (
    <section ref={sectionRef} id="platform" className="scroll-mt-[72px] bg-white">
      <div className="mx-auto max-w-[90rem] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div data-product-heading className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Lihat software-nya
          </p>
          <h2 className="mt-4 text-4xl font-black leading-[0.96] tracking-[-0.04em] text-zinc-950 sm:text-6xl">
            Update dari belakang layar. Booth tetap berjalan.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
            Admin Web mengatur tema, frame, dan konfigurasi. Aplikasi booth fokus melayani pengunjung tanpa perlu mengganggu operasional.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[0.34fr_0.66fr] lg:items-stretch">
          <div className="flex flex-col justify-between border-y border-blue-100 py-2">
            <div>
              {previewKeys.map((key, index) => {
                const item = productPreviews[key];
                const Icon = item.icon;
                const active = key === activePreview;

                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActivePreview(key)}
                    className={cn(
                      "group relative flex w-full items-center justify-between overflow-hidden border-b border-blue-100 px-1 py-5 text-left transition-colors duration-300",
                      active ? "text-[#00357B]" : "text-zinc-500 hover:text-zinc-950",
                    )}
                  >
                    <span className={cn(
                      "absolute inset-y-0 left-0 w-1 origin-bottom bg-[#00357B] transition-transform duration-500",
                      active ? "scale-y-100" : "scale-y-0",
                    )} />
                    <span className="flex items-center gap-3 text-sm font-semibold">
                      <span className={cn(
                        "grid size-8 place-items-center rounded-lg transition-[background-color,transform] duration-300",
                        active ? "translate-x-2 bg-blue-50" : "group-hover:translate-x-1",
                      )}>
                        <Icon className="size-4" />
                      </span>
                      {item.label}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-zinc-400">0{index + 1}</span>
                      <ArrowRight className={cn("size-4 transition-transform duration-300", active && "translate-x-1")} />
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="hidden max-w-xs py-7 text-sm leading-6 text-zinc-500 lg:block">
              Admin Web adalah ruang kontrol. Aplikasi booth adalah ruang kerja operator.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[26px] border border-blue-100 bg-[linear-gradient(145deg,#f4f8ff_0%,#ffffff_58%,#fff7f8_100%)] p-3 shadow-[0_20px_50px_rgba(0,53,123,0.1)] sm:p-6">
            <div className="mb-4 flex items-center justify-between border-b border-blue-100 px-1 pb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              <span>Product preview</span>
              <span className="text-[#00357B]">{preview.label}</span>
            </div>
            <div className="relative min-h-[260px] sm:min-h-[420px]">
              {previewKeys.map((key, index) => {
                const item = productPreviews[key];
                return (
                  <div
                    key={key}
                    ref={(element) => { previewRefs.current[index] = element; }}
                    aria-hidden={activePreview !== key}
                    className="invisible absolute inset-0 flex items-center justify-center opacity-0 first:visible first:opacity-100"
                  >
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.imageAlt}
                        width={1600}
                        height={1100}
                        className="h-full w-full object-contain drop-shadow-[0_24px_24px_rgba(24,24,27,0.18)]"
                      />
                    ) : (
                      <div className="flex min-h-[260px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#00357B]/25 bg-white/65 px-6 text-center sm:min-h-[420px]">
                        <span className="grid size-14 place-items-center rounded-2xl bg-[#00357B] text-white"><Settings2 className="size-6" /></span>
                        <p className="mt-5 text-lg font-bold text-zinc-900">Screenshot settings aplikasi</p>
                        <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">Placeholder untuk halaman pengaturan kamera, printer, koneksi, dan mode booth di aplikasi Flutter.</p>
                        <code className="mt-5 rounded-lg bg-blue-50 px-3 py-2 text-xs text-[#00357B]">/public/App/Settings.png</code>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-4 max-w-2xl px-1 text-sm leading-6 text-zinc-600">
              {preview.description}
            </p>
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[#00357B]/10 bg-white/70 px-4 py-3 text-sm text-zinc-600">
              <span className="relative flex size-2.5 shrink-0">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
              </span>
              <span>
                <strong className="font-semibold text-zinc-900">Booth tetap online.</strong>{" "}
                Perubahan dari Admin Web tersinkron tanpa menghentikan sesi yang sedang berjalan.
              </span>
            </div>
          </div>
        </div>

        <div className="mt-14 grid border-y border-blue-100 sm:grid-cols-3">
          {proofPoints.map((point) => (
            <div key={point.label} className="border-b border-blue-100 py-6 last:border-0 sm:border-b-0 sm:border-r sm:px-6 sm:last:border-r-0">
              <p className="text-2xl font-black tracking-[-0.03em] text-[#00357B] sm:text-3xl">{point.value}</p>
              <p className="mt-2 text-sm text-zinc-500">{point.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const businessPaths = [
  {
    icon: ScanLine,
    title: "Mulai dari booth pertama",
    description: "Siapkan tampilan dan alur sesi dari Admin Web, lalu biarkan aplikasi booth menjalankan event di lokasi.",
  },
  {
    icon: ArrowRight,
    title: "Ubah tampilan tanpa turun ke booth",
    description: "Perbarui tema atau frame dari balik layar. Operator tidak perlu menghentikan aplikasi untuk menerima perubahan.",
  },
  {
    icon: Building2,
    title: "Berkembang ke banyak booth",
    description: "Atur banyak device dari satu workspace dan pertahankan setiap booth tetap siap melayani pengunjung.",
  },
] as const;

export function WorkflowBand() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const nearViewport = useNearViewport(sectionRef);

  useLayoutEffect(() => {
    if (!nearViewport) return;
    if (!sectionRef.current) return;

    const context = gsap.context(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      gsap.from("[data-workflow-heading] > *", {
        autoAlpha: 0,
        y: 32,
        duration: 0.7,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 72%",
          once: true,
        },
      });

      cardRefs.current.forEach((card, index) => {
        if (!card) return;
        gsap.from(card, {
          autoAlpha: 0,
          x: index === 0 ? -44 : index === 2 ? 44 : 0,
          y: index === 1 ? 38 : 12,
          rotate: index === 0 ? -1.5 : index === 2 ? 1.5 : 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: card,
            start: "top 82%",
            once: true,
          },
        });
      });

      gsap.from("[data-workflow-proof]", {
        autoAlpha: 0,
        y: 18,
        duration: 0.5,
        stagger: 0.08,
        ease: "power2.out",
        scrollTrigger: {
          trigger: "[data-workflow-proofs]",
          start: "top 86%",
          once: true,
        },
      });
    }, sectionRef);

    return () => context.revert();
  }, [nearViewport]);

  return (
    <section ref={sectionRef} id="workflow" className="scroll-mt-[72px] overflow-hidden bg-[#eef4ff] text-zinc-950">
      <div className="mx-auto max-w-[90rem] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div data-workflow-heading className="max-w-3xl">
          <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.04em] sm:text-6xl">
            Kendali di web. Operasional di booth.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
            Pisahkan pekerjaan pengelola dan operator, sehingga update dapat dilakukan tanpa mengganggu pengunjung yang sedang dilayani.
          </p>
        </div>

        <div className="mt-12 grid border-t border-[#00357B]/20 lg:grid-cols-[1.1fr_0.9fr_1.1fr]">
          {businessPaths.map(({ icon: Icon, title, description }, index) => (
            <article
              key={title}
              ref={(element) => { cardRefs.current[index] = element; }}
              className="border-b border-[#00357B]/20 py-8 lg:border-b-0 lg:border-r lg:px-8 first:lg:pl-0 last:lg:border-r-0 last:lg:pr-0"
            >
              <div className="flex items-center justify-between text-[#00357B]">
                <span className="text-xs font-bold uppercase tracking-[0.18em]">0{index + 1}</span>
                <Icon className="size-5" />
              </div>
              <h3 className="mt-12 max-w-xs text-2xl font-black tracking-[-0.02em]">{title}</h3>
              <p className="mt-3 max-w-sm text-sm leading-7 text-zinc-600">{description}</p>
            </article>
          ))}
        </div>

        <div data-workflow-proofs className="mt-12 flex flex-wrap gap-x-6 gap-y-3 border-t border-[#00357B]/20 pt-6 text-sm font-medium text-[#00357B]">
          <span data-workflow-proof className="flex items-center gap-2"><Users className="size-4" />Operator fokus ke pengunjung</span>
          <span data-workflow-proof className="flex items-center gap-2"><CreditCard className="size-4" />Tema dan frame bisa diubah jarak jauh</span>
          <span data-workflow-proof className="flex items-center gap-2"><Share2 className="size-4" />Booth tetap berjalan saat update</span>
        </div>
      </div>
    </section>
  );
}

const commonQuestions = [
  {
    question: "Apakah POSKART cocok untuk satu booth?",
    answer:
      "Ya. Paket Starter dibuat untuk satu device, dan Anda bisa menambah kapasitas ketika mulai mengelola booth atau event yang lebih banyak.",
  },
  {
    question: "Saya sudah memakai aplikasi lain. Apakah bisa mencoba dulu?",
    answer:
      "Bisa. Gunakan trial untuk melihat dashboard, menyiapkan tampilan, dan menguji alur operasional sebelum menjadikan POSKART bagian dari event Anda.",
  },
  {
    question: "Apa saja yang dapat disesuaikan?",
    answer:
      "Anda dapat menyesuaikan tampilan booth, frame, theme, serta branding halaman download seperti nama bisnis, logo, subtitle, dan footer.",
  },
  {
    question: "Apakah tersedia QRIS dan cash?",
    answer:
      "POSKART mendukung pencatatan pembayaran QRIS dan cash sehingga operator dapat memilih alur yang sesuai dengan kebutuhan booth atau event.",
  },
  {
    question: "Apakah Showcase termasuk dalam paket?",
    answer:
      "Showcase tersedia untuk semua paket dan dapat digunakan untuk membagikan pilihan frame, theme, serta referensi visual kepada cafe atau calon partner event.",
  },
] as const;

export function LandingFAQ() {
  const sectionRef = useRef<HTMLElement>(null);
  const nearViewport = useNearViewport(sectionRef);

  useLayoutEffect(() => {
    if (!nearViewport) return;
    if (!sectionRef.current) return;
    const context = gsap.context(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.from("[data-faq-heading]", {
        autoAlpha: 0,
        x: -36,
        duration: 0.75,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 76%", once: true },
      });
      gsap.from("[data-faq-item]", {
        autoAlpha: 0,
        x: 32,
        duration: 0.62,
        stagger: 0.07,
        ease: "power3.out",
        scrollTrigger: { trigger: "[data-faq-list]", start: "top 82%", once: true },
      });
    }, sectionRef);
    return () => context.revert();
  }, [nearViewport]);

  return (
    <section ref={sectionRef} id="faq" className="scroll-mt-[72px] overflow-hidden bg-white">
      <div className="mx-auto grid max-w-[90rem] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.7fr_1.3fr] lg:px-12 lg:py-24">
        <div data-faq-heading>
          <h2 className="max-w-md text-4xl font-black leading-[0.96] tracking-[-0.04em] sm:text-5xl">
            Sebelum mulai atau pindah, pastikan dulu.
          </h2>
          <p className="mt-5 max-w-sm text-base leading-7 text-zinc-600">
            Jawaban singkat untuk kebutuhan operator baru dan bisnis yang sudah berjalan.
          </p>
        </div>
        <div data-faq-list className="border-t border-blue-100">
          {commonQuestions.map(({ question, answer }, index) => (
            <FAQItem key={question} answer={answer} index={index} question={question} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({
  answer,
  index,
  question,
}: {
  answer: string;
  index: number;
  question: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const panelId = `faq-answer-${index}`;

  useLayoutEffect(() => {
    if (!panelRef.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animation = gsap.to(panelRef.current, {
      height: open ? "auto" : 0,
      autoAlpha: open ? 1 : 0,
      duration: reduced ? 0 : open ? 0.48 : 0.32,
      ease: open ? "power3.out" : "power2.inOut",
      overwrite: true,
    });
    return () => {
      animation.kill();
    };
  }, [open]);

  return (
    <div data-faq-item className="border-b border-blue-100">
      <button
        type="button"
        aria-controls={panelId}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="group flex w-full items-center justify-between gap-6 py-5 text-left text-base font-semibold text-zinc-900 transition-colors hover:text-[#00357B]"
      >
        {question}
        <span className={cn(
          "text-2xl font-normal leading-none text-[#00357B] transition-transform duration-300",
          open && "rotate-45",
        )}>+</span>
      </button>
      <div ref={panelRef} id={panelId} className="h-0 overflow-hidden opacity-0">
        <p className="max-w-2xl pb-5 pr-10 text-sm leading-7 text-zinc-600">{answer}</p>
      </div>
    </div>
  );
}

export function LandingCTA({ planLabel }: { planLabel: string | null }) {
  return (
    <section className="cta-gradient-poskart text-white">
      <div className="mx-auto grid max-w-[90rem] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-end lg:px-12 lg:py-28">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">Siap melihat POSKART bekerja?</p>
          <h2 className="mt-5 max-w-4xl text-4xl font-black leading-[0.94] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
            Jalankan receipt photobooth Anda dengan lebih teratur.
          </h2>
          {planLabel ? <p className="mt-5 text-sm text-blue-100">{planLabel}</p> : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Link
            href="/register"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-[#00357B] transition-[background-color,transform] duration-200 hover:bg-blue-50 active:translate-y-px"
          >
            Coba gratis 14 hari <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/45 px-6 text-sm font-bold text-white transition-[background-color,transform] duration-200 hover:bg-white hover:text-[#00357B] active:translate-y-px"
          >
            Bicara dengan kami <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
