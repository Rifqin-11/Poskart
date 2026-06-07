import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Blocks,
  CheckCircle2,
  CreditCard,
  Headphones,
  Layers3,
  MonitorSmartphone,
  Palette,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PricingCards } from "@/features/billing/pricing/pricing-cards";
import { ProductScrollytelling } from "@/features/root/home/product-scrollytelling";
import {
  PublicFooter,
  PublicHeader,
} from "@/features/root/shell/public-site-shell";
import { businessProfile, type PricingPlan } from "@/lib/constants/business";

const capabilities = [
  {
    title: "Visual Builder",
    description:
      "Bangun setiap layar pengalaman booth dengan canvas dan layer yang terstruktur.",
    icon: Blocks,
    number: "01",
  },
  {
    title: "Theme & Asset CMS",
    description:
      "Kelola identitas visual, frame, template, dan media dari satu tempat.",
    icon: Palette,
    number: "02",
  },
  {
    title: "Device Operations",
    description:
      "Pantau perangkat, konfigurasi, dan status sinkronisasi untuk setiap booth.",
    icon: MonitorSmartphone,
    number: "03",
  },
  {
    title: "QRIS Monitoring",
    description:
      "Ikuti status transaksi dan alur pembayaran sebagai bagian dari operasi booth.",
    icon: CreditCard,
    number: "04",
  },
  {
    title: "Operational Analytics",
    description:
      "Baca aktivitas dan performa operasi untuk mendukung keputusan tim.",
    icon: BarChart3,
    number: "05",
  },
  {
    title: "Organization Control",
    description:
      "Atur anggota, peran, lokasi, dan perangkat sesuai struktur bisnis.",
    icon: ShieldCheck,
    number: "06",
  },
];

const workflow = [
  {
    text: "Buat akun dan pilih paket sesuai jumlah perangkat.",
    icon: Sparkles,
    hint: "Mulai gratis, upgrade kapan saja",
  },
  {
    text: "Atur identitas brand, aset, dan template booth.",
    icon: Palette,
    hint: "Desain sekali, pakai di semua booth",
  },
  {
    text: "Hubungkan perangkat lalu terbitkan konfigurasi.",
    icon: Zap,
    hint: "Sinkronisasi otomatis ke lapangan",
  },
  {
    text: "Pantau transaksi dan operasi dari dashboard.",
    icon: BarChart3,
    hint: "Realtime, lintas lokasi",
  },
];

export function HomePage({ plans }: { plans: PricingPlan[] }) {
  return (
    <main className="min-h-screen overflow-clip bg-[#fbfaf8] text-zinc-950">
      <PublicHeader />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative isolate min-h-[calc(100svh-4rem)] overflow-hidden border-b border-zinc-200">
        {/* Background layers */}
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_82%_20%,rgba(251,146,60,0.24),transparent_34%),radial-gradient(circle_at_20%_15%,rgba(244,63,94,0.16),transparent_30%),linear-gradient(to_bottom,#fffaf7,#fbfaf8)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(24,24,27,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(24,24,27,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />

        <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          {/* Left — copy */}
          <div className="animate-[fade-up_0.7s_ease-out_both]">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-200/80 bg-white/80 px-3 py-1.5 text-xs font-medium text-rose-700 shadow-sm ring-1 ring-rose-100 backdrop-blur">
              <Sparkles className="size-3.5" />
              Operating system untuk photobooth modern
            </div>
            <h1 className="mt-7 max-w-3xl text-balance text-5xl font-semibold tracking-[-0.05em] sm:text-6xl lg:text-7xl lg:leading-[0.93]">
              Satu pusat kendali untuk{" "}
              <span className="bg-gradient-to-r from-rose-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                seluruh pengalaman photobooth.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-zinc-500">
              Rancang tampilan, publikasikan tema, kelola perangkat, dan pantau
              transaksi dalam alur kerja yang utuh bersama POSKART.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className={buttonVariants({
                  size: "lg",
                  className:
                    "h-12 bg-zinc-950 px-6 text-white shadow-xl shadow-zinc-950/20 transition-transform hover:-translate-y-px hover:bg-zinc-800 active:translate-y-0",
                })}
              >
                Mulai dengan POSKART
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/subscriptions"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className:
                    "h-12 border-zinc-200 bg-white/80 px-6 transition-transform hover:-translate-y-px active:translate-y-0",
                })}
              >
                Lihat paket
                <Layers3 className="size-4" />
              </Link>
            </div>
            <a
              href="#platform"
              className="mt-12 inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-950"
            >
              Jelajahi cara kerjanya
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </div>

          {/* Right — product mockup */}
          <div className="relative mx-auto w-full max-w-xl animate-[fade-up_0.9s_ease-out_0.15s_both]">
            <div className="absolute -inset-10 -z-10 rounded-full bg-gradient-to-br from-rose-300/30 to-orange-200/40 blur-3xl" />
            <div className="rotate-1 rounded-[2rem] border border-zinc-200/80 bg-white/80 p-3 shadow-2xl shadow-rose-950/10 backdrop-blur-xl transition-transform hover:rotate-[0.5deg]">
              <div className="overflow-hidden rounded-[1.35rem] border border-zinc-200 bg-zinc-950 text-white">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-rose-400" />
                    <span className="size-2.5 rounded-full bg-amber-400" />
                    <span className="size-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                    POSKART Control Room
                  </span>
                </div>
                <div className="grid gap-4 p-5 sm:grid-cols-[1fr_0.72fr]">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-zinc-500">Workspace</p>
                        <p className="mt-1 font-semibold">Booth experience</p>
                      </div>
                      <Workflow className="size-5 text-rose-300" />
                    </div>
                    <div className="mt-8 space-y-3">
                      {["Design", "Theme", "Device", "Analytics"].map(
                        (item, index) => (
                          <div
                            key={item}
                            className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3"
                          >
                            <span className="grid size-7 place-items-center rounded-lg bg-white/10 font-mono text-[10px] text-zinc-400">
                              0{index + 1}
                            </span>
                            <span className="text-sm text-zinc-300">{item}</span>
                            <CheckCircle2 className="ml-auto size-4 text-emerald-400" />
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                  <div className="flex min-h-72 flex-col rounded-2xl bg-gradient-to-b from-rose-50 to-orange-50 p-4 text-zinc-950">
                    <div className="text-center font-mono text-xs font-bold tracking-[0.2em]">
                      POSKART
                    </div>
                    <div className="mt-5 grid flex-1 place-items-center rounded-xl border border-rose-100 bg-white shadow-sm">
                      <div className="grid grid-cols-2 gap-2">
                        {[0, 1, 2, 3].map((item) => (
                          <span
                            key={item}
                            className="size-12 rounded-lg bg-gradient-to-br from-rose-300 to-orange-200"
                          />
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 rounded-full bg-zinc-950 py-3 text-center text-xs font-semibold text-white">
                      Mulai sesi
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Floating badge */}
            <div className="absolute -bottom-5 -left-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-xl sm:-left-8">
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg bg-emerald-100">
                  <Zap className="size-4 text-emerald-700" />
                </span>
                <div>
                  <p className="text-xs font-semibold">Siap dipublikasikan</p>
                  <p className="text-[10px] text-zinc-500">
                    Desain dan perangkat terhubung
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gradient bridge to dark scrollytelling */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-zinc-950/8" />
      </section>

      {/* ── SCROLLYTELLING ────────────────────────────────────────────────── */}
      <ProductScrollytelling />

      {/* ── CAPABILITIES ──────────────────────────────────────────────────── */}
      <section id="capabilities" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-600">
              Platform lengkap
            </p>
            <h2 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Dibangun untuk pekerjaan harian, bukan sekadar tampilan.
            </h2>
            <p className="mt-5 text-base leading-8 text-zinc-500">
              POSKART menyatukan pekerjaan kreatif dan operasional agar tim
              dapat bergerak dari perubahan desain ke eksekusi lapangan tanpa
              kehilangan konteks.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-200 sm:grid-cols-2">
            {capabilities.map((capability) => {
              const Icon = capability.icon;
              return (
                <article
                  key={capability.title}
                  className="group relative bg-white p-6 transition-all duration-200 hover:-translate-y-px hover:bg-rose-50/40 hover:shadow-sm sm:p-8"
                >
                  <span className="absolute top-5 right-5 font-mono text-[10px] text-zinc-300 sm:top-7 sm:right-7">
                    {capability.number}
                  </span>
                  <div className="grid size-11 place-items-center rounded-2xl bg-zinc-100 text-zinc-700 transition-colors group-hover:bg-rose-100 group-hover:text-rose-700">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold">
                    {capability.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-zinc-500">
                    {capability.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── WORKFLOW ──────────────────────────────────────────────────────── */}
      <section className="border-y border-zinc-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:gap-20 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">
              Mulai tanpa kerumitan
            </p>
            <h2 className="mt-5 max-w-2xl text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Dari akun baru hingga booth aktif dalam satu alur.
            </h2>
            <p className="mt-5 text-base leading-8 text-zinc-500">
              Tidak perlu konfigurasi teknis yang rumit. Setiap langkah dirancang
              agar tim non-teknis sekalipun dapat bergerak mandiri.
            </p>
          </div>
          <ol className="relative space-y-0">
            {workflow.map((item, index) => {
              const Icon = item.icon;
              const isLast = index === workflow.length - 1;
              return (
                <li key={item.text} className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-zinc-950 font-mono text-xs text-white shadow-md">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    {!isLast && (
                      <div className="mt-1 w-px flex-1 bg-gradient-to-b from-zinc-300 to-transparent" />
                    )}
                  </div>
                  <div className={!isLast ? "pb-8" : ""}>
                    <div className="flex items-center gap-2 pt-2">
                      <Icon className="size-4 shrink-0 text-zinc-400" />
                      <p className="text-sm font-medium leading-6 text-zinc-800">
                        {item.text}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">{item.hint}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="mb-12 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-600">
            Paket berlangganan
          </p>
          <h2 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Pilih kapasitas yang sesuai dengan operasi Anda.
          </h2>
          <p className="mt-5 text-base leading-8 text-zinc-500">
            Mulai dari satu perangkat, lalu tingkatkan paket saat jumlah booth
            dan kebutuhan tim bertambah.
          </p>
        </div>
        <PricingCards plans={plans} />
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 text-sm leading-7 text-zinc-600">
          <p>{businessProfile.taxNote}</p>
          <p>{businessProfile.billingNote}</p>
          <p>{businessProfile.purchaseFlow}</p>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-zinc-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(244,63,94,0.35),transparent_34%),radial-gradient(circle_at_85%_80%,rgba(251,146,60,0.28),transparent_38%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_0.65fr] lg:px-8 lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-zinc-300">
              <Headphones className="size-3.5" />
              Dukungan POSKART
            </div>
            <h2 className="mt-6 max-w-3xl text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Bangun pengalaman booth yang lebih rapi, konsisten, dan mudah
              dikembangkan.
            </h2>
          </div>
          <div className="flex flex-col justify-end">
            <p className="text-base leading-8 text-zinc-400">
              Tim POSKART siap membantu kebutuhan onboarding, paket bisnis, dan
              implementasi operasi photobooth Anda.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Link
                href="/register"
                className={buttonVariants({
                  variant: "secondary",
                  size: "lg",
                  className:
                    "bg-white text-zinc-950 hover:bg-zinc-50 transition-transform hover:-translate-y-px active:translate-y-0",
                })}
              >
                Buat akun
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/contact"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className:
                    "border-white/20 bg-white/5 text-white hover:bg-white/10 transition-transform hover:-translate-y-px active:translate-y-0",
                })}
              >
                Hubungi kami
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
