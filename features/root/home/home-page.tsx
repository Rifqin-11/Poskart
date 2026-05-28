import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Blocks,
  Building2,
  CheckCircle2,
  CreditCard,
  Headphones,
  Layers3,
  Mail,
  MessageCircle,
  MonitorSmartphone,
  Palette,
  Phone,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  MapPin,
  Zap,
} from "lucide-react";
import {
  PublicFooter,
  PublicHeader,
} from "@/features/root/shell/public-site-shell";
import { PricingCards } from "@/features/billing/pricing/pricing-cards";
import { buttonVariants } from "@/components/ui/button";
import { businessProfile } from "@/lib/constants/business";
import type { PricingPlan } from "@/lib/constants/business";

const features = [
  {
    title: "Visual Builder",
    description:
      "Build landing, camera, preview, and thanks screens with bounded canvas controls.",
    icon: Blocks,
  },
  {
    title: "Theme CMS",
    description:
      "Manage kiosk branding, colors, typography, receipt assets, and publish states.",
    icon: Palette,
  },
  {
    title: "Booth Operations",
    description:
      "Track device health, sync status, pricing profile, and assigned templates.",
    icon: MonitorSmartphone,
  },
  {
    title: "QRIS Monitoring",
    description:
      "Watch real-time payments, failed logs, manual verification, and retry actions.",
    icon: CreditCard,
  },
];

const metrics = [
  ["326", "demo transactions"],
  ["98.7%", "demo QRIS success"],
  ["18", "demo active booths"],
  ["Rp 128.6jt", "demo monthly revenue"],
];

const supportChannels = [
  {
    title: "WhatsApp Support",
    detail: businessProfile.whatsapp,
    description:
      "Fast operational support for kiosk issues, QRIS checks, and booth status.",
    href: businessProfile.whatsappUrl,
    icon: MessageCircle,
  },
  {
    title: "Email Center",
    detail: businessProfile.email,
    description:
      "Best for onboarding, billing, tenant setup, and technical documentation.",
    href: `mailto:${businessProfile.email}`,
    icon: Mail,
  },
  {
    title: "Sales Hotline",
    detail: businessProfile.phone,
    description:
      "Talk about pricing, franchise rollout, enterprise setup, and custom plans.",
    href: `mailto:${businessProfile.salesEmail}`,
    icon: Phone,
  },
  {
    title: "Business Address",
    detail: businessProfile.address,
    description:
      "Alamat operasional POSKART untuk kebutuhan administrasi, legal, dan verifikasi bisnis.",
    href: "/contact",
    icon: MapPin,
  },
];

const faqs = [
  [
    "Can POSKART manage multiple booth locations?",
    "Yes. The admin dashboard is structured for multi-booth and multi-tenant operations.",
  ],
  [
    "Does the builder update kiosk previews instantly?",
    "Yes. The visual builder stores layout as JSON schema and updates preview state immediately.",
  ],
  [
    "Can we connect Supabase and QRIS later?",
    "Yes. The current implementation is mock-first, but services and Supabase clients are prepared for real integration.",
  ],
  [
    "Is there support for custom templates?",
    "Yes. Receipt, frame, postcard, seasonal, and event templates are part of the admin workflow.",
  ],
];

const trustedLogos = [
  "PVJ Bandung",
  "Mall Kelapa Gading",
  "Senayan City",
  "Plaza Indonesia",
  "Pakuwon Mall",
  "Tunjungan Plaza",
];

const testimonials = [
  {
    quote:
      "POSKART memangkas waktu setup booth dari hitungan hari menjadi menit. Visual builder-nya benar-benar life-saver untuk tim ops kami.",
    author: "Rendy Pradana",
    role: "Operations Lead · Snapbox Indonesia",
  },
  {
    quote:
      "QRIS monitoring real-time dan retry print bikin gangguan teknis di lapangan turun drastis. Customer happy, support ticket sepi.",
    author: "Lia Anggraini",
    role: "Franchise Owner · FotoStasiun",
  },
  {
    quote:
      "Tema dan template bisa di-publish per booth dari satu dashboard. Skala 18 lokasi tanpa repot kirim teknisi ke tiap mal.",
    author: "Yusuf Hakim",
    role: "CTO · Klikbooth",
  },
];

const playbooks: [string, string][] = [
  [
    "Guided onboarding",
    "Tenant setup, booth assignment, QRIS configuration, and initial template publishing.",
  ],
  [
    "Operational playbooks",
    "Standard workflows for failed payments, device refresh, restart, and promo changes.",
  ],
  [
    "Role-based access",
    "Admin and staff workflows are prepared for SaaS tenant permissions.",
  ],
  [
    "Storage-ready assets",
    "Supabase Storage and Cloudflare R2 boundaries are represented in the architecture.",
  ],
];

export function HomePage({ plans }: { plans: PricingPlan[] }) {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-zinc-950">
      <PublicHeader />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-zinc-200 bg-gradient-to-b from-rose-50/60 via-white to-white">
        {/* Decorative background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(244,63,94,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(251,146,60,0.14),transparent_50%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        />
        <div className="absolute -top-16 right-1/4 -z-10 size-[420px] rounded-full bg-rose-300/30 blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 -z-10 size-[420px] rounded-full bg-amber-200/30 blur-3xl" />

        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:px-8">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/70 px-3 py-1 text-xs font-medium text-rose-600 shadow-sm backdrop-blur">
              <Sparkles className="size-3.5" />
              SaaS CMS for receipt-style photobooths
            </div>
            <h1 className="max-w-4xl text-balance text-5xl font-semibold tracking-tight text-zinc-950 sm:text-6xl lg:text-7xl">
              Run your photobooth empire from{" "}
              <span className="bg-gradient-to-br from-rose-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                one beautiful dashboard
              </span>
              .
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-zinc-600">
              {businessProfile.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contact"
                className={buttonVariants({
                  size: "lg",
                  className:
                    "bg-gradient-to-br from-rose-600 to-orange-500 shadow-lg shadow-rose-500/30 hover:from-rose-500 hover:to-orange-400",
                })}
              >
                Request Demo
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/subscriptions"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                View Pricing
                <Layers3 className="size-4" />
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
              <div className="flex -space-x-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="grid size-7 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-rose-200 to-orange-200 text-[10px] font-semibold text-rose-800 shadow-sm"
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="size-3.5 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <span className="font-medium text-zinc-700">4.9/5</span>
                <span>· 200+ booth operators trust POSKART</span>
              </div>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              {metrics.map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-xl border border-zinc-200/80 bg-white/80 p-4 shadow-sm backdrop-blur"
                >
                  <div className="text-xl font-semibold tracking-tight">
                    {value}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">{label}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Dashboard numbers shown here are demo preview data for product
              illustration.
            </p>
          </div>

          {/* Hero visual */}
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[36px] bg-gradient-to-br from-rose-200/50 via-orange-100/40 to-transparent blur-2xl" />
            <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl shadow-rose-500/10">
              <div className="flex items-center justify-between border-b border-zinc-200 bg-gradient-to-b from-zinc-50 to-white px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-rose-400" />
                  <span className="size-2.5 rounded-full bg-amber-400" />
                  <span className="size-2.5 rounded-full bg-emerald-400" />
                  <div className="ml-3">
                    <div className="text-sm font-semibold">
                      POSKART Live Studio
                    </div>
                    <div className="text-xs text-zinc-500">
                      Demo kiosk preview
                    </div>
                  </div>
                </div>
                <div className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                  ● Live
                </div>
              </div>
              <div className="grid gap-4 p-5">
                <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-white">
                  <div
                    aria-hidden
                    className="absolute -right-12 -top-12 size-36 rounded-full bg-rose-500/30 blur-2xl"
                  />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <div className="text-xs text-zinc-400">
                        Demo revenue today
                      </div>
                      <div className="mt-2 text-3xl font-semibold">
                        Rp 4.820.000
                      </div>
                      <div className="mt-1 text-xs font-medium text-emerald-400">
                        ▲ +22% vs yesterday
                      </div>
                    </div>
                    <div className="grid size-12 place-items-center rounded-xl bg-white/10">
                      <BarChart3 className="size-6 text-rose-300" />
                    </div>
                  </div>
                  <div className="mt-6 h-24 rounded-lg bg-white/5 p-3">
                    <div className="flex h-full items-end gap-2">
                      {[42, 58, 44, 68, 74, 92, 81].map((height, index) => (
                        <span
                          key={index}
                          className="flex-1 rounded-t bg-gradient-to-t from-rose-500 to-orange-400"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="text-sm font-semibold">
                        Builder layers
                      </div>
                      <Zap className="size-4 text-rose-500" />
                    </div>
                    {[
                      "Hero title",
                      "Receipt preview",
                      "QR block",
                      "Start button",
                    ].map((item) => (
                      <div
                        key={item}
                        className="mb-2 flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 text-sm last:mb-0"
                      >
                        <span>{item}</span>
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      </div>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-white p-4 font-mono">
                    <div className="text-center text-sm font-bold tracking-wider">
                      POSKART
                    </div>
                    <div className="my-4 grid h-32 place-items-center rounded bg-white shadow-sm">
                      <div className="grid grid-cols-2 gap-1 p-2">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="size-6 rounded-sm bg-gradient-to-br from-rose-300 to-orange-200"
                          />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 text-[10px]">
                      <div className="flex justify-between">
                        <span>DOUBLE</span>
                        <span>10K</span>
                      </div>
                      <div className="flex justify-between font-bold text-emerald-600">
                        <span>QRIS</span>
                        <span>PAID</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Floating badge */}
            <div className="absolute -left-4 top-20 hidden rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl lg:block">
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded-lg bg-emerald-100">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs font-semibold">QRIS confirmed</div>
                  <div className="text-[10px] text-zinc-500">PVJ-Booth-01</div>
                </div>
              </div>
            </div>
            <div className="absolute -right-4 bottom-12 hidden rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl lg:block">
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded-lg bg-rose-100">
                  <Sparkles className="size-4 text-rose-600" />
                </div>
                <div>
                  <div className="text-xs font-semibold">Theme published</div>
                  <div className="text-[10px] text-zinc-500">
                    18 booths synced
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUSTED BY */}
      <section className="border-b border-zinc-200 bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 text-center text-xs font-medium uppercase tracking-widest text-zinc-500">
            Trusted by photobooth operators across Indonesia
          </div>
          <div className="grid grid-cols-2 items-center gap-6 sm:grid-cols-3 md:grid-cols-6">
            {trustedLogos.map((name) => (
              <div
                key={name}
                className="text-center text-sm font-semibold tracking-tight text-zinc-400 transition-colors hover:text-zinc-700"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLATFORM / FEATURES */}
      <section
        id="platform"
        className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8"
      >
        <div className="mb-12 max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
            <Blocks className="size-3.5 text-rose-500" />
            Platform
          </div>
          <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            The operating system for receipt-style{" "}
            <span className="text-rose-600">photobooths</span>.
          </h2>
          <p className="mt-4 text-base leading-7 text-zinc-600">
            Everything you need to launch, theme, monitor, and scale your kiosks
            — without juggling three different tools.
          </p>
        </div>
        <div
          id="operations"
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            const tones = [
              "from-rose-500/15 to-rose-500/0 text-rose-600",
              "from-orange-500/15 to-orange-500/0 text-orange-600",
              "from-emerald-500/15 to-emerald-500/0 text-emerald-600",
              "from-sky-500/15 to-sky-500/0 text-sky-600",
            ];
            return (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${tones[
                    idx % tones.length
                  ]
                    .split(" ")
                    .slice(0, 2)
                    .join(" ")} opacity-60`}
                />
                <div
                  className={`relative mb-5 grid size-11 place-items-center rounded-xl border border-zinc-200 bg-white shadow-sm ${tones[
                    idx % tones.length
                  ]
                    .split(" ")
                    .slice(2)
                    .join(" ")}`}
                >
                  <Icon className="size-5" />
                </div>
                <h3 className="relative text-base font-semibold">
                  {feature.title}
                </h3>
                <p className="relative mt-2 text-sm leading-6 text-zinc-500">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-y border-zinc-200 bg-gradient-to-b from-zinc-50 via-white to-zinc-50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
              <Quote className="size-3.5 text-rose-500" />
              Loved by operators
            </div>
            <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              From single booth to nationwide rollout.
            </h2>
            <p className="mt-4 text-base leading-7 text-zinc-600">
              Operators across Indonesia ship faster, monitor smarter, and scale
              calmer with POSKART.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure
                key={t.author}
                className="relative flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <Quote className="size-6 text-rose-200" />
                <blockquote className="text-sm leading-7 text-zinc-700">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-auto border-t border-zinc-100 pt-4">
                  <div className="text-sm font-semibold text-zinc-900">
                    {t.author}
                  </div>
                  <div className="text-xs text-zinc-500">{t.role}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section id="builder" className="border-y border-zinc-200 bg-zinc-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1fr] lg:px-8">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
              <ShieldCheck className="size-3.5" />
              Public review ready
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">
              Clear public pages for payment gateway review.
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-600">
              POSKART exposes public pricing, contact, about, terms, privacy,
              and refund policy pages. The operating dashboard remains separate
              from the public merchant review surface.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3">
              {[
                ["/", "Public POSKART landing page"],
                ["/subscriptions", "Public package and billing information"],
                ["/contact", "Customer service and sales contact"],
                ["/terms", "Terms and Conditions"],
                ["/refund-policy", "Refund and cancellation policy"],
              ].map(([route, label]) => (
                <div
                  key={route}
                  className="flex items-center justify-between rounded-md border border-zinc-100 px-4 py-3"
                >
                  <code className="font-mono text-sm">{route}</code>
                  <span className="text-sm text-zinc-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="pricing"
        className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
              <CreditCard className="size-3.5 text-red-500" />
              SaaS pricing
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">
              Plans for every photobooth operation stage.
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Start simple, then scale into multi-location kiosk operations with
              advanced builder, analytics, tenant management, and support.
            </p>
          </div>
          <div className="rounded-full border border-zinc-200 bg-zinc-50 p-1 text-xs font-medium text-zinc-600">
            1, 3, 6, and 12-month subscription available
          </div>
        </div>

        <PricingCards plans={plans} />
        <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
          <p>{businessProfile.taxNote}</p>
          <p className="mt-1">{businessProfile.billingNote}</p>
          <p className="mt-1">{businessProfile.purchaseFlow}</p>
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-zinc-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
              <Headphones className="size-3.5" />
              Support and onboarding
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">
              Everything a SaaS operator needs after signup.
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-600">
              POSKART is designed for daily operations, not only design
              customization. Teams can launch booths, monitor transactions,
              publish templates, and coordinate support from one system.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {playbooks.map(([title, description]) => (
              <div
                key={title}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-4 grid size-9 place-items-center rounded-lg bg-gradient-to-br from-rose-100 to-orange-100 text-rose-700">
                  <ShieldCheck className="size-4" />
                </div>
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="contact"
        className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
              <Building2 className="size-3.5 text-red-500" />
              Contact center
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">
              Talk to POSKART support or sales.
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-600">
              Use the contact center for onboarding, enterprise pricing, kiosk
              rollout, QRIS operations, media storage, and booth technical
              support.
            </p>
            <div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-950 p-6 text-white">
              <div className="text-sm font-semibold">
                Need an enterprise rollout?
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                POSKART can be configured for franchise tenants, event partners,
                custom booth fleets, and internal team permissions.
              </p>
              <Link
                href={`mailto:${businessProfile.salesEmail}`}
                className={buttonVariants({
                  variant: "secondary",
                  size: "lg",
                  className: "mt-5",
                })}
              >
                Contact Sales
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            {supportChannels.map((channel) => {
              const Icon = channel.icon;
              return (
                <div
                  key={channel.title}
                  className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-4">
                      <div className="grid size-11 shrink-0 place-items-center rounded-md bg-zinc-100">
                        <Icon className="size-5 text-zinc-700" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">
                          {channel.title}
                        </h3>
                        <p className="mt-1 text-sm font-medium text-zinc-950">
                          {channel.detail}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-zinc-500">
                          {channel.description}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={channel.href}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      Open
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-zinc-200 bg-zinc-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
              <MessageCircle className="size-3.5 text-rose-500" />
              FAQ
            </div>
            <h2 className="text-balance text-4xl font-semibold tracking-tight">
              Common SaaS questions.
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Quick answers for teams evaluating POSKART as a photobooth
              operations platform.
            </p>
          </div>
          <div className="grid gap-3">
            {faqs.map(([question, answer], idx) => (
              <div
                key={question}
                className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-rose-200"
              >
                <div className="flex items-start gap-3">
                  <div className="grid size-7 shrink-0 place-items-center rounded-full bg-rose-50 text-xs font-semibold text-rose-600">
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{question}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      {answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-zinc-200 bg-zinc-950 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.35),transparent_50%),radial-gradient(circle_at_bottom_right,rgba(251,146,60,0.3),transparent_55%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        />
        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
            <Sparkles className="size-3.5" />
            Ready to launch?
          </div>
          <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Spin up your first POSKART booth this week.
          </h2>
          <p className="max-w-2xl text-base leading-7 text-zinc-300">
            Free onboarding walkthrough, dedicated WhatsApp support, and a
            template library ready to publish. No long-term commitment.
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/contact"
              className={buttonVariants({
                size: "lg",
                className:
                  "bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow-lg shadow-rose-500/40 hover:from-rose-400 hover:to-orange-300",
              })}
            >
              Request a demo
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/subscriptions"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className:
                  "border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20",
              })}
            >
              See pricing
              <Layers3 className="size-4" />
            </Link>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              QRIS-ready out of the box
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              Multi-tenant SaaS
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              Supabase + Cloudflare R2 ready
            </span>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
