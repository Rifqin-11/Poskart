import Link from "next/link";
import Image from "next/image";
import {
  ArrowDown,
  ArrowRight,
  Camera,
  CreditCard,
  ImageIcon,
  Layers3,
  MonitorSmartphone,
  Palette,
  Printer,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  PublicFooter,
  PublicHeader,
} from "@/features/root/shell/public-site-shell";
import type { PricingPlan } from "@/lib/constants/business";

const operatorFeatures = [
  {
    title: "Booth screen flow",
    description:
      "Landing, kamera, preview, payment, dan thank-you screen dari satu builder.",
    icon: Camera,
  },
  {
    title: "Frame templates",
    description:
      "Frame event, layout foto, warna brand, dan template siap publish ke booth.",
    icon: Palette,
  },
  {
    title: "Print packages",
    description:
      "Paket single, double, triple print, promo, dan batas cetak tersinkron.",
    icon: Printer,
  },
  {
    title: "POS and QRIS",
    description:
      "Kasir manual, pembayaran QRIS, dan riwayat transaksi untuk operator event.",
    icon: CreditCard,
  },
  {
    title: "Device monitor",
    description:
      "Pantau booth online, sinkronisasi layout, dan status operasional perangkat.",
    icon: MonitorSmartphone,
  },
  {
    title: "Team workspace",
    description:
      "Akses admin, operator, dan staff event tetap berada di satu organisasi.",
    icon: ShieldCheck,
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
  { title: "Booth online", value: "3 devices", icon: MonitorSmartphone },
  { title: "QRIS success", value: "98%", icon: QrCode },
  { title: "Print queue", value: "Ready", icon: Printer },
];

export function HomePage({ plans }: { plans: PricingPlan[] }) {
  const starterPlan = plans.find((plan) => plan.id === "monthly") ?? plans[0];

  return (
    <main className="min-h-screen overflow-clip bg-[#fbfaf8] text-zinc-950">
      <PublicHeader />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden border-b border-zinc-200 bg-white">
        <div className="absolute inset-x-0 top-0 -z-20 h-[38rem] bg-[radial-gradient(circle_at_50%_8%,rgba(251,146,60,0.18),transparent_32%),linear-gradient(to_bottom,#fff8ef,#ffffff_78%)]" />

        <div className="mx-auto max-w-7xl px-4 pt-10 pb-20 text-center sm:px-6 lg:px-8 lg:pt-14 lg:pb-24">
          <div className="relative mx-auto max-w-5xl animate-[fade-up_0.8s_ease-out_both]">
            <div className="absolute inset-x-16 top-20 bottom-8 -z-10 rounded-[3rem] bg-orange-200/35 blur-3xl" />
            <div className="relative min-h-[19rem] sm:min-h-[28rem] lg:min-h-[36rem]">
              <div className="absolute inset-x-0 top-0 mx-auto w-[72%] max-w-3xl">
                <Image
                  src="/POSKART Photobooth.png"
                  alt="POSKART photobooth kiosk"
                  width={1500}
                  height={1000}
                  priority
                  className="mx-auto h-auto w-full object-contain drop-shadow-2xl"
                />
              </div>

              <div className="absolute left-[21%] top-[42%] w-[48%] max-w-lg sm:top-[44%] lg:top-[45%]">
                <Image
                  src="/iPad Pro 11.png"
                  alt="POSKART admin dashboard on iPad Pro"
                  width={1100}
                  height={760}
                  priority
                  className="h-auto w-full drop-shadow-2xl"
                />
              </div>

              <div className="absolute right-[18%] top-[39%] w-[16%] max-w-40 sm:top-[41%] lg:top-[42%]">
                <Image
                  src="/iPhone 13 Pro.png"
                  alt="POSKART customer download screen on iPhone"
                  width={420}
                  height={820}
                  priority
                  className="h-auto w-full drop-shadow-2xl"
                />
              </div>
            </div>
          </div>

          <div className="mx-auto mt-2 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 shadow-sm shadow-orange-900/5">
            <Image
              src="/app-logo.png"
              alt="POSKART app icon"
              width={20}
              height={20}
              className="size-5 rounded-md object-cover"
            />
            Aplikasi photobooth untuk capture, print, QRIS, dan dashboard
          </div>

          <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-semibold tracking-[-0.055em] sm:text-5xl lg:text-[4rem] lg:leading-[0.95]">
            Jalankan photobooth dari sesi foto sampai cetak.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-zinc-600 sm:text-lg">
            POSKART menyatukan layar booth, kamera, template frame, pilihan
            paket print, pembayaran QRIS, dan monitoring perangkat dalam satu
            aplikasi yang siap dipakai operator photobooth.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className={buttonVariants({
                size: "lg",
                className:
                  "h-12 rounded-full bg-zinc-950 px-6 text-white shadow-xl shadow-zinc-950/20 transition-transform hover:-translate-y-px hover:bg-zinc-800 active:translate-y-0",
              })}
            >
              Mulai setup booth
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/subscriptions"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className:
                  "h-12 rounded-full border-zinc-200 bg-white/80 px-6 transition-transform hover:-translate-y-px active:translate-y-0",
              })}
            >
              Lihat paket photobooth
              <Layers3 className="size-4" />
            </Link>
          </div>

          <a
            href="#platform"
            className="mt-12 inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-950"
          >
            Lihat alur photobooth
            <ArrowDown className="size-4 animate-bounce" />
          </a>
        </div>

        {/* Gradient bridge to dark scrollytelling */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-zinc-950/8" />
      </section>

      <section id="platform" className="bg-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-32">
          <div className="order-2 lg:order-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">
              Capture, preview, print
            </p>
            <h2 className="mt-5 max-w-xl text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Satu alur customer, dari layar mulai sampai foto tercetak.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-8 text-zinc-500">
              Customer memilih paket, booth mengambil foto, menampilkan preview,
              menerima pembayaran, lalu operator bisa langsung mencetak hasilnya.
            </p>
          </div>
          <div className="order-1 lg:order-2">
            <div className="relative overflow-hidden rounded-[2.4rem] border border-zinc-200 bg-[#fff7ed] p-5 shadow-sm">
              <div className="absolute inset-x-10 top-10 h-48 rounded-full bg-orange-200/50 blur-3xl" />
              <div className="relative grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[1.7rem] bg-zinc-950 p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-zinc-500">Booth screen</p>
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
                <div className="space-y-4 rounded-[1.7rem] bg-white p-4">
                  {sessionSteps.map(({ title, description, icon: Icon }) => (
                    <div key={title} className="flex items-center gap-4 rounded-2xl border border-zinc-100 p-4">
                      <span className="grid size-11 place-items-center rounded-2xl bg-orange-50 text-orange-600">
                        <Icon className="size-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{title}</p>
                        <p className="mt-1 text-xs text-zinc-500">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="builder" className="bg-[#fbfaf8]">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-32">
          <div className="relative rounded-[2.4rem] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-rose-100/60 blur-3xl" />
            <Image
              src="/iPad Pro 11.png"
              alt="POSKART visual builder on iPad"
              width={1100}
              height={760}
              className="mx-auto h-auto w-full max-w-3xl"
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {["Landing", "Camera", "Thanks"].map((label) => (
                <div key={label} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                  <div className="mb-3 flex aspect-video items-center justify-center rounded-xl bg-white">
                    <ImageIcon className="size-5 text-rose-500" />
                  </div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="mt-1 text-xs text-zinc-500">Published screen</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-600">
              Design once, publish everywhere
            </p>
            <h2 className="mt-5 max-w-xl text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Frame event dan layar booth tetap konsisten.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-8 text-zinc-500">
              Susun halaman landing, kamera, preview, dan selesai dari builder.
              Saat layout dipublish, perangkat booth memakai konfigurasi yang sama.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {["Visual builder", "Frame template", "Publish per booth"].map((item) => (
                <span key={item} className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-32">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
              POS, QRIS, operations
            </p>
            <h2 className="mt-5 max-w-xl text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Kasir print dan monitoring perangkat ada di satu tempat.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-8 text-zinc-500">
              Operator dapat mencatat penjualan cash atau QRIS, melihat paket
              terlaris, serta memantau booth online tanpa spreadsheet manual.
            </p>
          </div>
          <div className="relative overflow-hidden rounded-[2.4rem] border border-zinc-200 bg-zinc-950 p-5 text-white shadow-sm">
            <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-emerald-500/20 to-transparent" />
            <div className="relative grid gap-4 lg:grid-cols-[1fr_0.54fr]">
              <div className="rounded-[1.7rem] bg-white p-4 text-zinc-950">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500">POS Kasir hari ini</p>
                    <p className="mt-1 text-2xl font-semibold">Rp 294.000</p>
                  </div>
                  <CreditCard className="size-5 text-emerald-600" />
                </div>
                <div className="mt-6 space-y-3">
                  {posSalesPreview.map(({ name, price, method }) => (
                    <div key={name} className="flex items-center justify-between rounded-2xl border border-zinc-100 p-3">
                      <div>
                        <p className="text-sm font-semibold">{name}</p>
                        <p className="mt-1 text-xs text-zinc-500">{method}</p>
                      </div>
                      <p className="text-sm font-semibold">{price}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                {operationHighlights.map(({ title, value, icon: Icon }) => (
                  <div key={title} className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                    <Icon className="mb-4 size-5 text-emerald-300" />
                    <p className="text-xs text-zinc-500">{title}</p>
                    <p className="mt-1 text-xl font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#fbfaf8]">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
              Powerful features
            </p>
            <h2 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Dibuat khusus untuk operator photobooth.
            </h2>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-200 sm:grid-cols-2 lg:grid-cols-3">
            {operatorFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="bg-white p-7">
                  <Icon className="size-5 text-zinc-400" />
                  <h3 className="mt-6 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-zinc-500">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-zinc-200 bg-[#fff8ef] p-6 sm:p-10 lg:flex lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">
                Mulai dari satu booth
              </p>
              <h2 className="mt-4 max-w-2xl text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Aktifkan POSKART untuk booth pertama, lalu tambah perangkat saat event bertambah.
              </h2>
              <p className="mt-4 text-sm leading-7 text-zinc-500">
                {starterPlan
                  ? `${starterPlan.name} mulai ${starterPlan.price} untuk ${starterPlan.includedDevices} device.`
                  : "Paket lengkap tersedia di halaman pricing POSKART."}
              </p>
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:mt-0">
              <Link
                href="/subscriptions"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "rounded-full border-zinc-200 bg-white",
                })}
              >
                Lihat paket
                <Layers3 className="size-4" />
              </Link>
              <Link
                href="/register"
                className={buttonVariants({
                  size: "lg",
                  className: "rounded-full bg-zinc-950 text-white hover:bg-zinc-800",
                })}
              >
                Buat akun
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
