"use client";

import { useState } from "react";
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
import { cn } from "@/lib/utils";
import { landingAssets } from "@/features/root/home/landing-content";

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
    description: "Kelola brand, device, transaksi, dan operasional semua booth dari browser.",
    image: landingAssets.hero.src,
    imageAlt: landingAssets.hero.alt,
    icon: MonitorCheck,
  },
  booth: {
    label: "Aplikasi Booth",
    description: "Aplikasi Flutter untuk menjalankan pembayaran, kamera, preview, dan cetak di lokasi.",
    image: landingAssets.boothApp.src,
    imageAlt: landingAssets.boothApp.alt,
    icon: MonitorCog,
  },
  settings: {
    label: "Settings Aplikasi",
    description: "Atur kamera, printer, koneksi, dan perilaku booth langsung dari aplikasi Flutter.",
    image: null,
    imageAlt: "Placeholder screenshot pengaturan aplikasi Flutter POSKART",
    icon: Settings2,
  },
};

const proofPoints = [
  { value: "Admin Web", label: "untuk pengelolaan bisnis" },
  { value: "Poskart App", label: "untuk operasional booth" },
  { value: "1 sistem", label: "data dan device tersinkron" },
];

export function ProductShowcase() {
  const [activePreview, setActivePreview] = useState<ProductPreviewKey>("admin");
  const preview = productPreviews[activePreview];

  return (
    <section id="platform" className="scroll-mt-[72px] bg-white">
      <div className="mx-auto max-w-[90rem] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Lihat software-nya
          </p>
          <h2 className="mt-4 text-4xl font-black leading-[0.96] tracking-[-0.04em] text-zinc-950 sm:text-6xl">
            Dua aplikasi, satu operasional yang terhubung.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
            Admin Web mengelola bisnisnya. Aplikasi Flutter menjalankan booth dan pengaturan perangkat di lokasi.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[0.34fr_0.66fr] lg:items-stretch">
          <div className="flex flex-col justify-between border-y border-blue-100 py-2">
            <div>
              {(Object.keys(productPreviews) as ProductPreviewKey[]).map((key) => {
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
                      "flex w-full items-center justify-between border-b border-blue-100 px-1 py-5 text-left transition-[color,transform] duration-200 active:translate-x-px",
                      active ? "text-[#00357B]" : "text-zinc-500 hover:text-zinc-950",
                    )}
                  >
                    <span className="flex items-center gap-3 text-sm font-semibold">
                      <Icon className="size-4" />
                      {item.label}
                    </span>
                    <ArrowRight className={cn("size-4 transition-transform", active && "translate-x-1")} />
                  </button>
                );
              })}
            </div>
            <p className="hidden max-w-xs py-7 text-sm leading-6 text-zinc-500 lg:block">
              Pilih permukaan produk untuk melihat peran masing-masing dalam satu alur POSKART.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[26px] border border-blue-100 bg-[linear-gradient(145deg,#f4f8ff_0%,#ffffff_58%,#fff7f8_100%)] p-3 shadow-[0_20px_50px_rgba(0,53,123,0.1)] sm:p-6">
            <div className="mb-4 flex items-center justify-between border-b border-blue-100 px-1 pb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              <span>Product preview</span>
              <span className="text-[#00357B]">{preview.label}</span>
            </div>
            <div className="flex min-h-[260px] items-center justify-center sm:min-h-[420px]">
              {preview.image ? (
                <Image
                  key={activePreview}
                  src={preview.image}
                  alt={preview.imageAlt}
                  width={1600}
                  height={1100}
                  className="h-full w-full object-contain drop-shadow-[0_24px_24px_rgba(24,24,27,0.18)]"
                />
              ) : (
                <div className="flex min-h-[260px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#00357B]/25 bg-white/65 px-6 text-center sm:min-h-[420px]">
                  <span className="grid size-14 place-items-center rounded-2xl bg-[#00357B] text-white">
                    <Settings2 className="size-6" />
                  </span>
                  <p className="mt-5 text-lg font-bold text-zinc-900">Screenshot settings aplikasi</p>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                    Placeholder untuk halaman pengaturan kamera, printer, koneksi, dan mode booth di aplikasi Flutter.
                  </p>
                  <code className="mt-5 rounded-lg bg-blue-50 px-3 py-2 text-xs text-[#00357B]">
                    /public/App/Settings.png
                  </code>
                </div>
              )}
            </div>
            <p className="mt-4 max-w-2xl px-1 text-sm leading-6 text-zinc-600">
              {preview.description}
            </p>
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
    description: "Siapkan tampilan, pembayaran, dan alur sesi tanpa menambah kompleksitas yang belum Anda perlukan.",
  },
  {
    icon: ArrowRight,
    title: "Beralih dari aplikasi lama",
    description: "Lihat software lebih dulu, uji alur kerja, lalu pindah saat Anda sudah yakin POSKART cocok.",
  },
  {
    icon: Building2,
    title: "Berkembang ke banyak booth",
    description: "Tambahkan device dan tetap pantau status booth dari satu workspace saat event semakin banyak.",
  },
] as const;

export function WorkflowBand() {
  return (
    <section id="workflow" className="scroll-mt-[72px] bg-[#eef4ff] text-zinc-950">
      <div className="mx-auto max-w-[90rem] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div className="max-w-3xl">
          <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.04em] sm:text-6xl">
            POSKART mengikuti tahap bisnis Anda.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
            Mulai dengan sederhana, pertahankan brand Anda, dan tambah kapasitas ketika booth mulai bertambah.
          </p>
        </div>

        <div className="mt-12 grid border-t border-[#00357B]/20 lg:grid-cols-[1.1fr_0.9fr_1.1fr]">
          {businessPaths.map(({ icon: Icon, title, description }, index) => (
            <article
              key={title}
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

        <div className="mt-12 flex flex-wrap gap-x-6 gap-y-3 border-t border-[#00357B]/20 pt-6 text-sm font-medium text-[#00357B]">
          <span className="flex items-center gap-2"><Users className="size-4" />Antrean pengunjung lebih teratur</span>
          <span className="flex items-center gap-2"><CreditCard className="size-4" />QRIS dan cash tercatat</span>
          <span className="flex items-center gap-2"><Share2 className="size-4" />Showcase siap dibagikan</span>
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
  return (
    <section id="faq" className="scroll-mt-[72px] bg-white">
      <div className="mx-auto grid max-w-[90rem] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.7fr_1.3fr] lg:px-12 lg:py-24">
        <div>
          <h2 className="max-w-md text-4xl font-black leading-[0.96] tracking-[-0.04em] sm:text-5xl">
            Sebelum mulai atau pindah, pastikan dulu.
          </h2>
          <p className="mt-5 max-w-sm text-base leading-7 text-zinc-600">
            Jawaban singkat untuk kebutuhan operator baru dan bisnis yang sudah berjalan.
          </p>
        </div>
        <div className="border-t border-blue-100">
          {commonQuestions.map(({ question, answer }) => (
            <details key={question} className="group border-b border-blue-100">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-base font-semibold text-zinc-900 marker:hidden [&::-webkit-details-marker]:hidden">
                {question}
                <span className="text-2xl font-normal leading-none text-[#00357B] transition-transform duration-200 group-open:rotate-45">+</span>
              </summary>
              <p className="max-w-2xl pb-5 pr-10 text-sm leading-7 text-zinc-600">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
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
