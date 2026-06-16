"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import {
  Camera,
  CreditCard,
  MonitorSmartphone,
  Palette,
  Printer,
  ShieldCheck,
  Layers3,
  QrCode,
  ArrowRight,
  ImageIcon,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/* ── Data ─────────────────────────────────────────────────────────── */

const operatorFeatures = [
  {
    title: "Booth Screen Flow",
    description:
      "Landing, kamera, preview, payment, dan thank-you screen dari satu builder.",
    icon: Camera,
    accent: "group-hover:bg-rose-50",
    iconBg: "bg-rose-50",
    iconColor: "text-rose-500",
    span: "sm:col-span-2",
  },
  {
    title: "Frame Templates",
    description:
      "Frame event, layout foto, warna brand, dan template siap publish ke booth.",
    icon: Palette,
    accent: "group-hover:bg-orange-50",
    iconBg: "bg-orange-50",
    iconColor: "text-orange-500",
    span: "",
  },
  {
    title: "Print Packages",
    description:
      "Paket single, double, triple print, promo, dan batas cetak tersinkron.",
    icon: Printer,
    accent: "group-hover:bg-amber-50",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    span: "",
  },
  {
    title: "POS & QRIS",
    description:
      "Kasir manual, pembayaran QRIS, dan riwayat transaksi untuk operator event.",
    icon: CreditCard,
    accent: "group-hover:bg-emerald-50",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    span: "",
  },
  {
    title: "Device Monitor",
    description:
      "Pantau booth online, sinkronisasi layout, dan status operasional perangkat.",
    icon: MonitorSmartphone,
    accent: "group-hover:bg-sky-50",
    iconBg: "bg-sky-50",
    iconColor: "text-sky-500",
    span: "",
  },
  {
    title: "Team Workspace",
    description:
      "Akses admin, operator, dan staff event tetap berada di satu organisasi.",
    icon: ShieldCheck,
    accent: "group-hover:bg-violet-50",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-500",
    span: "sm:col-span-2",
  },
];

const sessionSteps = [
  {
    title: "Pilih paket",
    description: "Single, double, atau triple print",
    icon: Layers3,
  },
  {
    title: "Bayar QRIS",
    description: "Scan dan lanjutkan sesi",
    icon: QrCode,
  },
  {
    title: "Cetak foto",
    description: "Operator dapat mencetak dari POS",
    icon: Printer,
  },
];

const posSalesPreview = [
  { name: "Double Print", price: "Rp 10.000", method: "QRIS" },
  { name: "Single Print", price: "Rp 6.000", method: "Cash" },
  { name: "Triple Print", price: "Rp 14.000", method: "QRIS" },
];

const operationHighlights = [
  { title: "Booth online", value: "3", icon: MonitorSmartphone },
  { title: "QRIS success", value: "98%", icon: QrCode },
  { title: "Print queue", value: "Ready", icon: Printer },
];

/* ── Animated wrapper ─────────────────────────────────────────────── */

function AnimatedSection({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.25, 0.4, 0.25, 1] as const,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Section: Capture Flow ─────────────────────────────────────────── */

export function CaptureFlowSection() {
  return (
    <section id="platform" className="relative bg-white">
      <div className="section-divider" />

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-32">
        <AnimatedSection className="order-2 lg:order-1">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">
            <span className="size-1.5 rounded-full bg-orange-500" />
            Capture · Preview · Print
          </p>
          <h2 className="mt-5 max-w-xl text-balance text-3xl font-bold tracking-[-0.04em] text-zinc-950 sm:text-4xl lg:text-5xl">
            Satu alur customer, dari layar mulai sampai foto{" "}
            <span className="text-gradient-warm">tercetak.</span>
          </h2>
          <p className="mt-5 max-w-lg text-base leading-8 text-zinc-500">
            Customer memilih paket, booth mengambil foto, menampilkan preview,
            menerima pembayaran, lalu operator bisa langsung mencetak hasilnya.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {["Auto capture", "Live preview", "QRIS payment"].map((item) => (
              <span
                key={item}
                className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-600"
              >
                {item}
              </span>
            ))}
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.15} className="order-1 lg:order-2">
          <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-[#fffaf4] p-5 shadow-sm">
            <div className="absolute inset-x-10 top-10 h-48 rounded-full bg-orange-100/60 blur-3xl" />
            <div className="relative grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
              {/* Booth screen */}
              <div className="rounded-2xl bg-zinc-950 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                      Booth screen
                    </p>
                    <p className="text-sm font-semibold">Ready to capture</p>
                  </div>
                  <Camera className="size-5 text-orange-300" />
                </div>
                <div className="mt-5 grid aspect-[3/4] place-items-center rounded-2xl bg-gradient-to-br from-orange-100 to-rose-100">
                  <div className="grid size-28 place-items-center rounded-full bg-white/80">
                    <Camera className="size-9 text-zinc-950" />
                  </div>
                </div>
                <div className="mt-4 rounded-full bg-white py-3 text-center text-xs font-semibold text-zinc-950">
                  Ambil foto
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-3 rounded-2xl bg-white p-4">
                {sessionSteps.map(({ title, description, icon: Icon }, i) => (
                  <div
                    key={title}
                    className="flex items-center gap-4 rounded-xl border border-zinc-100 p-4 transition-colors hover:bg-zinc-50"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600">
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-zinc-950">
                        {title}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {description}
                      </p>
                    </div>
                    <span className="ml-auto font-mono text-[10px] text-zinc-300">
                      0{i + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ── Section: Builder ─────────────────────────────────────────────── */

export function BuilderSection() {
  return (
    <section id="builder" className="relative bg-zinc-50/50">
      <div className="section-divider" />

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-32">
        <AnimatedSection>
          <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-rose-50/80 blur-3xl" />
            <Image
              src="/iPad Pro 11.png"
              alt="POSKART visual builder on iPad"
              width={1100}
              height={760}
              className="mx-auto h-auto w-full max-w-3xl"
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {["Landing", "Camera", "Thanks"].map((label) => (
                <div
                  key={label}
                  className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 transition-colors hover:bg-white"
                >
                  <div className="mb-3 flex aspect-video items-center justify-center rounded-xl bg-white">
                    <ImageIcon className="size-5 text-rose-500" />
                  </div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="mt-1 text-xs text-zinc-500">Published screen</p>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.15}>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-rose-600">
            <span className="size-1.5 rounded-full bg-rose-500" />
            Design once, publish everywhere
          </p>
          <h2 className="mt-5 max-w-xl text-balance text-3xl font-bold tracking-[-0.04em] text-zinc-950 sm:text-4xl lg:text-5xl">
            Frame event dan layar booth{" "}
            <span className="text-gradient-warm">tetap konsisten.</span>
          </h2>
          <p className="mt-5 max-w-lg text-base leading-8 text-zinc-500">
            Susun halaman landing, kamera, preview, dan selesai dari builder.
            Saat layout dipublish, perangkat booth memakai konfigurasi yang sama.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {["Visual builder", "Frame template", "Publish per booth"].map(
              (item) => (
                <span
                  key={item}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-600"
                >
                  {item}
                </span>
              )
            )}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ── Section: POS & Operations ─────────────────────────────────────── */

export function OperationsSection() {
  return (
    <section className="relative bg-white">
      <div className="section-divider" />

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-32">
        <AnimatedSection>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            POS · QRIS · Operations
          </p>
          <h2 className="mt-5 max-w-xl text-balance text-3xl font-bold tracking-[-0.04em] text-zinc-950 sm:text-4xl lg:text-5xl">
            Kasir, print, dan monitoring{" "}
            <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              satu tempat.
            </span>
          </h2>
          <p className="mt-5 max-w-lg text-base leading-8 text-zinc-500">
            Operator dapat mencatat penjualan cash atau QRIS, melihat paket
            terlaris, serta memantau booth online tanpa spreadsheet manual.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.15}>
          <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-950 p-5 text-white shadow-sm">
            <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-emerald-500/15 to-transparent" />
            <div className="relative grid gap-4 lg:grid-cols-[1fr_0.54fr]">
              {/* POS card */}
              <div className="rounded-2xl bg-white p-4 text-zinc-950">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-400">
                      POS kasir hari ini
                    </p>
                    <p className="mt-1 text-2xl font-bold">Rp 294.000</p>
                  </div>
                  <div className="grid size-10 place-items-center rounded-xl bg-emerald-50">
                    <CreditCard className="size-5 text-emerald-600" />
                  </div>
                </div>
                <div className="mt-5 space-y-2.5">
                  {posSalesPreview.map(({ name, price, method }) => (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-xl border border-zinc-100 p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold">{name}</p>
                        <p className="mt-0.5 text-xs text-zinc-400">{method}</p>
                      </div>
                      <p className="text-sm font-semibold text-emerald-600">
                        {price}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-3">
                {operationHighlights.map(({ title, value, icon: Icon }) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <Icon className="mb-3 size-5 text-emerald-300" />
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                      {title}
                    </p>
                    <p className="mt-1 text-xl font-bold">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ── Section: Bento Feature Grid ────────────────────────────────────── */

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  return isMobile;
}

export function BentoFeaturesSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  // Track scroll position of the bento section relative to viewport
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Keep track of which cards have been revealed.
  // Once a card is revealed, it remains true and never goes back to false.
  const [revealedCards, setRevealedCards] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
    false,
  ]);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (isMobile) return;
    setRevealedCards((prev) => {
      const next = [...prev];
      let changed = false;
      
      for (let i = 0; i < 6; i++) {
        // Staggered thresholds: 0.05, 0.17, 0.29, 0.41, 0.53, 0.65
        const threshold = i * 0.12 + 0.05;
        if (latest >= threshold && !next[i]) {
          next[i] = true;
          changed = true;
        }
      }
      
      return changed ? next : prev;
    });
  });

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 90,
        damping: 14,
      }
    }
  };

  return (
    <section 
      ref={containerRef} 
      className="relative bg-zinc-50/50" 
      style={{ height: isMobile ? "auto" : "160vh" }}
    >
      <div className="section-divider" />

      <div className={cn(
        isMobile 
          ? "mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
          : "sticky top-0 flex h-screen flex-col justify-center overflow-hidden px-4 sm:px-6 lg:px-8"
      )}>
        <div className="mx-auto max-w-7xl w-full">
          {/* Header */}
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
              <span className="size-1.5 rounded-full bg-zinc-400" />
              Powerful Features
            </p>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-[-0.04em] text-zinc-950 sm:text-4xl lg:text-5xl">
              Dibuat khusus untuk operator{" "}
              <span className="text-gradient-warm">photobooth.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-zinc-500">
              Semua fitur yang dibutuhkan operator ada di satu platform, dari desain booth sampai monitoring perangkat dan transaksi.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {operatorFeatures.map((feature, i) => {
              const Icon = feature.icon;
              const isRevealed = isMobile || revealedCards[i];

              return (
                <motion.div
                  key={feature.title}
                  initial={isMobile ? "visible" : "hidden"}
                  animate={isRevealed ? "visible" : "hidden"}
                  variants={cardVariants}
                  className={cn("group", feature.span)}
                >
                  <div
                    className={cn(
                      "bento-card relative h-full overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 transition-colors shadow-sm",
                      feature.accent
                    )}
                  >
                    <div
                      className={cn(
                        "mb-4 grid size-10 place-items-center rounded-xl",
                        feature.iconBg
                      )}
                    >
                      <Icon className={cn("size-5", feature.iconColor)} />
                    </div>
                    <h3 className="text-base font-semibold text-zinc-950">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-xs leading-6 text-zinc-500">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Section: CTA ─────────────────────────────────────────────────── */

export function CTASection({ planLabel }: { planLabel: string | null }) {
  return (
    <section className="relative bg-white">
      <div className="section-divider" />

      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <AnimatedSection>
          <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-[#fff8ef] to-[#fff1e6] p-8 sm:p-12 lg:flex lg:items-center lg:justify-between lg:p-14">
            {/* Subtle glow */}
            <div className="absolute -right-20 -top-20 size-[300px] rounded-full bg-orange-200/30 blur-[80px]" />

            <div className="relative">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">
                <span className="size-1.5 rounded-full bg-orange-500" />
                Mulai dari satu booth
              </p>
              <h2 className="mt-4 max-w-2xl text-balance text-3xl font-bold tracking-[-0.04em] text-zinc-950 sm:text-4xl">
                Aktifkan POSKART untuk booth pertama, lalu skalakan.
              </h2>
              {planLabel && (
                <p className="mt-4 text-sm leading-7 text-zinc-500">
                  {planLabel}
                </p>
              )}
            </div>

            <div className="relative mt-7 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:shrink-0">
              <a
                href="/subscriptions"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-6 text-sm font-semibold text-zinc-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
              >
                Lihat paket
                <Layers3 className="size-4" />
              </a>
              <a
                href="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white shadow-lg shadow-zinc-950/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-xl"
              >
                Buat akun
                <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
