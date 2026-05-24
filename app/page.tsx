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
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/layout/public-site-shell";
import { PricingCards } from "@/components/pricing/pricing-cards";
import { buttonVariants } from "@/components/ui/button";
import { businessProfile } from "@/lib/constants/business";

const features = [
  {
    title: "Visual Builder",
    description: "Build landing, camera, preview, and thanks screens with bounded canvas controls.",
    icon: Blocks,
  },
  {
    title: "Theme CMS",
    description: "Manage kiosk branding, colors, typography, receipt assets, and publish states.",
    icon: Palette,
  },
  {
    title: "Booth Operations",
    description: "Track device health, sync status, pricing profile, and assigned templates.",
    icon: MonitorSmartphone,
  },
  {
    title: "QRIS Monitoring",
    description: "Watch real-time payments, failed logs, manual verification, and retry actions.",
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
    description: "Fast operational support for kiosk issues, QRIS checks, and booth status.",
    href: businessProfile.whatsappUrl,
    icon: MessageCircle,
  },
  {
    title: "Email Center",
    detail: businessProfile.email,
    description: "Best for onboarding, billing, tenant setup, and technical documentation.",
    href: `mailto:${businessProfile.email}`,
    icon: Mail,
  },
  {
    title: "Sales Hotline",
    detail: businessProfile.phone,
    description: "Talk about pricing, franchise rollout, enterprise setup, and custom plans.",
    href: `mailto:${businessProfile.salesEmail}`,
    icon: Phone,
  },
];

const faqs = [
  ["Can POSKART manage multiple booth locations?", "Yes. The admin dashboard is structured for multi-booth and multi-tenant operations."],
  ["Does the builder update kiosk previews instantly?", "Yes. The visual builder stores layout as JSON schema and updates preview state immediately."],
  ["Can we connect Supabase and QRIS later?", "Yes. The current implementation is mock-first, but services and Supabase clients are prepared for real integration."],
  ["Is there support for custom templates?", "Yes. Receipt, frame, postcard, seasonal, and event templates are part of the admin workflow."],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <PublicHeader />

      <section className="border-b border-zinc-200">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_520px] lg:px-8">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
              <Sparkles className="size-3.5 text-red-500" />
              SaaS CMS for receipt-style photobooths
            </div>
            <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-zinc-950 sm:text-6xl lg:text-7xl">
              POSKART admin, builder, and kiosk operations in one place.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
              {businessProfile.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/contact" className={buttonVariants({ size: "lg" })}>
                Request Demo
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/pricing" className={buttonVariants({ variant: "outline", size: "lg" })}>
                View Pricing
                <Layers3 className="size-4" />
              </Link>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              {metrics.map(([value, label]) => (
                <div key={label} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-xl font-semibold tracking-tight">{value}</div>
                  <div className="mt-1 text-xs text-zinc-500">{label}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Dashboard numbers shown here are demo preview data for product illustration.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[32px] bg-zinc-100" />
            <div className="relative overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
                <div>
                  <div className="text-sm font-semibold">POSKART Live Studio</div>
                  <div className="text-xs text-zinc-500">Demo kiosk preview</div>
                </div>
                <div className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                  Demo
                </div>
              </div>
              <div className="grid gap-4 p-5">
                <div className="rounded-xl border border-zinc-200 bg-zinc-950 p-5 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-zinc-400">Demo revenue today</div>
                      <div className="mt-2 text-3xl font-semibold">Rp 4.820.000</div>
                    </div>
                    <BarChart3 className="size-8 text-zinc-400" />
                  </div>
                  <div className="mt-6 h-24 rounded-lg bg-white/10 p-3">
                    <div className="flex h-full items-end gap-2">
                      {[42, 58, 44, 68, 74, 92, 81].map((height, index) => (
                        <span
                          key={index}
                          className="flex-1 rounded-t bg-white"
                          style={{ height: `${height}%`, opacity: 0.35 + index * 0.07 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                  <div className="rounded-xl border border-zinc-200 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="text-sm font-semibold">Builder layers</div>
                      <Zap className="size-4 text-red-500" />
                    </div>
                    {["Hero title", "Receipt preview", "QR block", "Start button"].map((item) => (
                      <div key={item} className="mb-2 flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 text-sm">
                        <span>{item}</span>
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 font-mono">
                    <div className="text-center text-sm font-bold">POSKART</div>
                    <div className="my-4 h-32 rounded bg-white shadow-sm" />
                    <div className="space-y-2 text-[10px]">
                      <div className="flex justify-between">
                        <span>DOUBLE</span>
                        <span>10K</span>
                      </div>
                      <div className="flex justify-between">
                        <span>QRIS</span>
                        <span>PAID</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight">Built as the operating system for POSKART kiosks.</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            The root page introduces the public product, while the complete admin system remains available in the admin route group.
          </p>
        </div>
        <div id="operations" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="mb-5 grid size-10 place-items-center rounded-md bg-zinc-100">
                  <Icon className="size-5 text-zinc-700" />
                </div>
                <h3 className="text-sm font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="builder" className="border-y border-zinc-200 bg-zinc-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1fr] lg:px-8">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
              <ShieldCheck className="size-3.5" />
              Public review ready
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">Clear public pages for payment gateway review.</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-600">
              POSKART exposes public pricing, contact, about, terms, privacy, and refund policy pages.
              The operating dashboard remains separate from the public merchant review surface.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3">
              {[
                ["/", "Public POSKART landing page"],
                ["/pricing", "Public package and billing information"],
                ["/contact", "Customer service and sales contact"],
                ["/terms", "Terms and Conditions"],
                ["/refund-policy", "Refund and cancellation policy"],
              ].map(([route, label]) => (
                <div key={route} className="flex items-center justify-between rounded-md border border-zinc-100 px-4 py-3">
                  <code className="font-mono text-sm">{route}</code>
                  <span className="text-sm text-zinc-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
              <CreditCard className="size-3.5 text-red-500" />
              SaaS pricing
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">Plans for every photobooth operation stage.</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Start simple, then scale into multi-location kiosk operations with advanced builder,
              analytics, tenant management, and support.
            </p>
          </div>
          <div className="rounded-full border border-zinc-200 bg-zinc-50 p-1 text-xs font-medium text-zinc-600">
            Monthly, 3-month, and yearly subscription available
          </div>
        </div>

        <PricingCards />
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
            <h2 className="text-3xl font-semibold tracking-tight">Everything a SaaS operator needs after signup.</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-600">
              POSKART is designed for daily operations, not only design customization.
              Teams can launch booths, monitor transactions, publish templates, and coordinate support from one system.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Guided onboarding", "Tenant setup, booth assignment, QRIS configuration, and initial template publishing."],
              ["Operational playbooks", "Standard workflows for failed payments, device refresh, restart, and promo changes."],
              ["Role-based access", "Admin and staff workflows are prepared for SaaS tenant permissions."],
              ["Storage-ready assets", "Supabase Storage and Cloudflare R2 boundaries are represented in the architecture."],
            ].map(([title, description]) => (
              <div key={title} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="mb-4 grid size-9 place-items-center rounded-md bg-zinc-100">
                  <ShieldCheck className="size-4 text-zinc-700" />
                </div>
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
              <Building2 className="size-3.5 text-red-500" />
              Contact center
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">Talk to POSKART support or sales.</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-600">
              Use the contact center for onboarding, enterprise pricing, kiosk rollout,
              QRIS operations, media storage, and booth technical support.
            </p>
            <div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-950 p-6 text-white">
              <div className="text-sm font-semibold">Need an enterprise rollout?</div>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                POSKART can be configured for franchise tenants, event partners, custom booth fleets,
                and internal team permissions.
              </p>
              <Link href={`mailto:${businessProfile.salesEmail}`} className={buttonVariants({ variant: "secondary", size: "lg", className: "mt-5" })}>
                Contact Sales
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            {supportChannels.map((channel) => {
              const Icon = channel.icon;
              return (
                <div key={channel.title} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-4">
                      <div className="grid size-11 shrink-0 place-items-center rounded-md bg-zinc-100">
                        <Icon className="size-5 text-zinc-700" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">{channel.title}</h3>
                        <p className="mt-1 text-sm font-medium text-zinc-950">{channel.detail}</p>
                        <p className="mt-2 text-sm leading-6 text-zinc-500">{channel.description}</p>
                      </div>
                    </div>
                    <Link href={channel.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      Open
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-zinc-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Common SaaS questions.</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Quick answers for teams evaluating POSKART as a photobooth operations platform.
            </p>
          </div>
          <div className="grid gap-3">
            {faqs.map(([question, answer]) => (
              <div key={question} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold">{question}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
