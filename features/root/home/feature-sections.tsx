"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView, useScroll, useMotionValueEvent } from "framer-motion";
import {
  BarChart3,
  Camera,
  CheckCircle2,
  ChevronDown,
  CloudUpload,
  CreditCard,
  GalleryHorizontal,
  Headphones,
  MonitorSmartphone,
  Palette,
  Printer,
  ShieldCheck,
  Layers3,
  QrCode,
  ArrowRight,
  ImageIcon,
  LockKeyhole,
  ReceiptText,
  Smartphone,
  Timer,
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

const workflowSteps = [
  {
    title: "Atur event",
    description:
      "Buat template, tema, paket harga, voucher, dan aturan print dari dashboard.",
    icon: Palette,
  },
  {
    title: "Jalankan booth",
    description:
      "Tablet Android menampilkan flow customer: pilih template, ambil foto, preview, dan bayar.",
    icon: Smartphone,
  },
  {
    title: "Terima pembayaran",
    description:
      "Gunakan QRIS, voucher, atau POS kasir manual sesuai kebutuhan event.",
    icon: CreditCard,
  },
  {
    title: "Kirim hasil",
    description:
      "Foto, GIF, dan Live Photo tersimpan ke gallery cloud dengan link download yang bisa diatur.",
    icon: CloudUpload,
  },
];

const featureGroups = [
  {
    title: "Kiosk & Capture",
    eyebrow: "Untuk pengalaman customer",
    icon: Camera,
    accent: "text-rose-500 bg-rose-50",
    items: [
      "Android kiosk app",
      "Camera countdown & preview",
      "Foto, GIF, dan Live Photo",
      "Custom landing sampai thank-you screen",
      "Landscape dan tablet-friendly layout",
    ],
  },
  {
    title: "Template & Branding",
    eyebrow: "Untuk event yang beda-beda",
    icon: Palette,
    accent: "text-orange-500 bg-orange-50",
    items: [
      "Visual layout builder",
      "Frame template manager",
      "Theme, logo, warna, dan asset event",
      "Publish layout ke booth",
      "Preview template sebelum dipakai",
    ],
  },
  {
    title: "Payment & Voucher",
    eyebrow: "Untuk monetisasi booth",
    icon: QrCode,
    accent: "text-emerald-600 bg-emerald-50",
    items: [
      "QRIS self-payment",
      "Status bayar real-time",
      "Voucher event dan voucher gratis",
      "POS cash/manual payment",
      "Log transaksi dan retry payment",
    ],
  },
  {
    title: "Print & Operations",
    eyebrow: "Untuk operator lapangan",
    icon: Printer,
    accent: "text-amber-600 bg-amber-50",
    items: [
      "Paket single/double/triple print",
      "Print queue dan retry print",
      "Device monitor",
      "Session timer dan auto-return",
      "Dashboard kasir harian",
    ],
  },
  {
    title: "Cloud Gallery",
    eyebrow: "Untuk softfile customer",
    icon: GalleryHorizontal,
    accent: "text-sky-600 bg-sky-50",
    items: [
      "Upload Cloudinary otomatis",
      "QR/link download customer",
      "Email dan WhatsApp delivery",
      "Masa aktif link bisa diatur",
      "Auto cleanup file lama",
    ],
  },
  {
    title: "Admin & Team",
    eyebrow: "Untuk bisnis yang tumbuh",
    icon: ShieldCheck,
    accent: "text-violet-600 bg-violet-50",
    items: [
      "Organization workspace",
      "Subscription dan device limit",
      "Super admin control",
      "Analytics transaksi",
      "Settings lock dan konfigurasi cloud",
    ],
  },
];

const capabilityRows = [
  ["Visual builder", "Layout screen + frame", "Web admin"],
  ["Payment", "QRIS, voucher, cash/POS", "Duitku"],
  ["Media output", "Foto, GIF, Live Photo", "Cloudinary"],
  ["Delivery", "Gallery link, email, WhatsApp", "Configurable"],
  ["Operations", "Device monitor, print queue, transactions", "Realtime sync"],
  ["Retention", "Link expiry + auto cleanup file", "Cron ready"],
];

const techSpecs = [
  { label: "Kiosk", value: "Flutter Android", icon: Smartphone },
  { label: "Dashboard", value: "Next.js admin web", icon: MonitorSmartphone },
  { label: "Payment", value: "QRIS + voucher", icon: ReceiptText },
  { label: "Storage", value: "Cloudinary gallery", icon: CloudUpload },
  { label: "Database", value: "Supabase", icon: BarChart3 },
  { label: "Support", value: "WhatsApp + email", icon: Headphones },
];

const faqs = [
  {
    question: "Apakah POSKART bisa dipakai tanpa operator?",
    answer:
      "Bisa untuk flow self-service seperti pilih paket, QRIS, foto, preview, dan link gallery. Operator tetap bisa memantau dari dashboard jika event membutuhkan kontrol tambahan.",
  },
  {
    question: "Apakah hasil foto customer langsung tersedia?",
    answer:
      "Foto dan softfile diunggah ke cloud gallery. Customer bisa membuka QR/link download, sementara GIF dan Live Photo dapat diproses di background.",
  },
  {
    question: "Apakah bisa pakai voucher selain QRIS?",
    answer:
      "Bisa. POSKART mendukung voucher event, voucher gratis, dan transaksi POS manual agar booth tetap fleksibel untuk CFD, wedding, brand activation, atau internal event.",
  },
  {
    question: "Apakah file lama bisa dihapus otomatis?",
    answer:
      "Bisa. Admin dapat mengatur masa aktif link dan retention Cloudinary dari Settings, lalu cleanup dijalankan melalui cron.",
  },
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

/* ── Section: Full Feature List ────────────────────────────────────── */

export function CompleteFeaturesSection() {
  return (
    <section id="features" className="relative bg-white">
      <div className="section-divider" />

      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <AnimatedSection>
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">
              <span className="size-1.5 rounded-full bg-orange-500" />
              Fitur POSKART
            </p>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-[-0.04em] text-zinc-950 sm:text-4xl lg:text-5xl">
              Bukan cuma aplikasi foto, tapi{" "}
              <span className="text-gradient-warm">operating system booth.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-zinc-500">
              Dari inspirasi dashboard photobooth modern sampai kebutuhan
              operasional lapangan, POSKART menyatukan desain, payment, print,
              gallery, dan monitoring dalam satu workflow.
            </p>
          </div>
        </AnimatedSection>

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featureGroups.map((group, index) => {
            const Icon = group.icon;
            return (
              <AnimatedSection key={group.title} delay={index * 0.04}>
                <div className="group h-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-colors hover:bg-zinc-50">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-zinc-400">
                        {group.eyebrow}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold tracking-tight text-zinc-950">
                        {group.title}
                      </h3>
                    </div>
                    <span
                      className={cn(
                        "grid size-11 shrink-0 place-items-center rounded-xl",
                        group.accent,
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                  </div>

                  <ul className="mt-6 space-y-3">
                    {group.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 text-sm leading-6 text-zinc-600"
                      >
                        <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Section: Workflow & Capabilities ──────────────────────────────── */

export function WorkflowSection() {
  return (
    <section className="relative bg-zinc-50/50">
      <div className="section-divider" />

      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
          <AnimatedSection>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
              <span className="size-1.5 rounded-full bg-zinc-400" />
              Cara kerja
            </p>
            <h2 className="mt-4 max-w-xl text-balance text-3xl font-bold tracking-[-0.04em] text-zinc-950 sm:text-4xl">
              Mulai dari setup event sampai customer menerima softfile.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-zinc-500">
              POSKART dibuat agar operator tidak perlu berpindah-pindah tools:
              konfigurasi event, transaksi, print, dan gallery berjalan dari
              satu sistem yang sama.
            </p>

            <div className="mt-8 grid gap-3">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-zinc-950 text-white">
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <p className="text-xs font-mono text-zinc-400">
                        0{index + 1}
                      </p>
                      <h3 className="mt-1 text-sm font-semibold text-zinc-950">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.12}>
            <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Capability map
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                  Yang sudah terhubung di POSKART.
                </h3>
              </div>

              <div className="divide-y divide-zinc-100">
                {capabilityRows.map(([area, capability, runtime]) => (
                  <div
                    key={area}
                    className="grid gap-2 p-5 text-sm sm:grid-cols-[0.65fr_1fr_0.75fr] sm:items-center"
                  >
                    <p className="font-semibold text-zinc-950">{area}</p>
                    <p className="text-zinc-500">{capability}</p>
                    <p className="font-mono text-xs text-zinc-400">{runtime}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {[
                { value: "4", label: "core flow customer", icon: Layers3 },
                { value: "3", label: "metode payment", icon: CreditCard },
                { value: "14d", label: "default file retention", icon: Timer },
              ].map(({ value, label, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <Icon className="mb-4 size-5 text-orange-500" />
                  <p className="text-2xl font-bold tracking-tight text-zinc-950">
                    {value}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

/* ── Section: Specs & FAQ ──────────────────────────────────────────── */

export function SpecsFaqSection() {
  return (
    <section className="relative bg-white">
      <div className="section-divider" />

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-28">
        <AnimatedSection>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
            <span className="size-1.5 rounded-full bg-sky-500" />
            Detail teknis
          </p>
          <h2 className="mt-4 max-w-xl text-balance text-3xl font-bold tracking-[-0.04em] text-zinc-950 sm:text-4xl">
            Siap untuk booth Android, dashboard cloud, dan event harian.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-7 text-zinc-500">
            Informasi ini membantu calon pengguna memahami apa yang mereka
            dapatkan sebelum mencoba POSKART di perangkat booth.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {techSpecs.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-5"
              >
                <Icon className="mb-4 size-5 text-zinc-500" />
                <p className="text-xs text-zinc-400">{label}</p>
                <p className="mt-1 text-sm font-semibold text-zinc-950">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.12}>
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  FAQ
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                  Pertanyaan umum.
                </h3>
              </div>
              <LockKeyhole className="size-5 text-zinc-400" />
            </div>

            <div className="divide-y divide-zinc-100">
              {faqs.map((faq) => (
                <details key={faq.question} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-zinc-950">
                    {faq.question}
                    <ChevronDown className="size-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm leading-7 text-zinc-500">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </AnimatedSection>
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
