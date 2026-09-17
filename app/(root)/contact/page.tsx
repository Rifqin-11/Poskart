import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Mail,
  MessageCircle,
} from "lucide-react";
import { PublicFooter, PublicHeader } from "@/features/root/shell/public-site-shell";
import { LandingButton } from "@/components/ui/landing-button";
import { businessProfile } from "@/lib/constants/business";

export const metadata: Metadata = {
  title: "Kontak POSKART | Dukungan Receipt Photobooth App",
  description:
    "Hubungi tim POSKART untuk pertanyaan teknis, onboarding, setup printer, QRIS, dan konsultasi receipt photobooth app.",
  alternates: {
    canonical: "/contact",
  },
};

const contacts = [
  {
    label: "WhatsApp Support",
    value: businessProfile.whatsapp,
    href: businessProfile.whatsappUrl,
    icon: MessageCircle,
    description: "Respons cepat untuk pertanyaan teknis dan operasional. Please don't call; kirim pesan melalui WhatsApp agar kami dapat membantu dengan baik.",
    cta: "Chat sekarang",
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    label: "Support Email",
    value: businessProfile.email,
    href: `mailto:${businessProfile.email}`,
    icon: Mail,
    description: "Pertanyaan umum, billing, dan laporan kendala platform.",
    cta: "Kirim email",
    color: "bg-blue-50 text-[#00357B]",
  },
  {
    label: "Sales Email",
    value: businessProfile.salesEmail,
    href: `mailto:${businessProfile.salesEmail}`,
    icon: Mail,
    description: "Onboarding baru, demo, dan informasi paket langganan.",
    cta: "Hubungi sales",
    color: "bg-violet-50 text-violet-700",
  },
];

const businessDetails = [
  { label: "Business name", value: businessProfile.businessName },
  { label: "Legal name", value: businessProfile.legalName },
  { label: "Address", value: businessProfile.address },
  { label: "Support hours", value: businessProfile.supportHours },
  { label: "Website", value: businessProfile.domain },
];

export default function ContactPage() {
  return (
    <main className="min-h-[100dvh] overflow-clip bg-[#f7f9ff] text-zinc-950">
      <PublicHeader variant="landing" />

      {/* Hero */}
      <section className="bg-[#F7F8FA] px-3 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 lg:px-10 lg:pb-24">
        <div className="mx-auto w-full max-w-[90rem]">
          <div className="relative overflow-hidden rounded-[28px] border border-white/40 bg-[radial-gradient(120%_130%_at_20%_20%,#5FA8FF_0%,#1F6FD0_52%,#014EB4_100%)] px-6 py-12 shadow-[0_28px_70px_rgba(0,53,123,0.22)] sm:rounded-[36px] sm:px-10 sm:py-16 lg:px-16 lg:py-20">
            <div className="relative z-10 max-w-3xl text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
                Contact center
              </p>
              <h1 className="mt-5 max-w-2xl text-[clamp(2rem,4.6vw,3.5rem)] font-black leading-[1.04] tracking-tight">
                Talk to the team behind your booth.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/85 sm:text-lg">
                Hubungi POSKART untuk onboarding, billing, QRIS operation,
                konfigurasi booth, dan pertanyaan teknis terkait platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact cards */}
      <section className="bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-[90rem]">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-4xl font-black leading-[0.98] tracking-tight text-zinc-900 sm:text-5xl">
              Pilih cara yang paling mudah.
            </h2>
            <p className="mt-5 text-lg leading-7 text-zinc-600">
              Tim POSKART membantu menjawab pertanyaan teknis dan kebutuhan operasional Anda.
            </p>
          </div>
          <div className="divide-y divide-zinc-200 border-y border-zinc-200">
            {contacts.map((contact) => {
              const Icon = contact.icon;
              return (
                <div
                  key={contact.label}
                  className="group grid gap-5 py-7 transition-transform duration-300 hover:translate-x-2 md:grid-cols-[minmax(180px,0.7fr)_minmax(0,1.2fr)_auto] md:items-center md:gap-8"
                >
                  <div className="flex items-center gap-4">
                    <div className={`grid size-11 shrink-0 place-items-center rounded-2xl ${contact.color}`}>
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-zinc-950">{contact.label}</h2>
                      <p className="mt-1 text-sm font-medium text-zinc-500">{contact.value}</p>
                    </div>
                  </div>
                  <p className="max-w-xl text-sm leading-6 text-zinc-600">
                    {contact.description}
                  </p>
                  <div>
                    <Link
                      href={contact.href}
                      target={contact.href.startsWith("http") ? "_blank" : undefined}
                      rel={contact.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#00357B] transition hover:gap-2.5 hover:text-[#014EB4]"
                    >
                      {contact.cta}
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-8 flex items-start gap-4 border-t border-zinc-200 pt-7 sm:items-center">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#F1F2F4] text-[#00357B]">
              <MessageCircle className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-950 sm:text-base">
                Anda akan dilayani oleh manusia langsung.
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-600">
                Setiap pertanyaan dan kendala ditangani oleh tim POSKART, bukan bot
                AI. Kami membaca pesan Anda dan membantu mencari solusi yang sesuai
                dengan kondisi bisnis Anda.
              </p>
              <p className="mt-2 text-xs font-medium text-zinc-500">
                Kirim pesan melalui WhatsApp atau email agar percakapan dan detail
                masalah dapat kami cek dengan lengkap.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Business details */}
      <section className="border-y border-zinc-200 bg-[#F7F8FA] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-[90rem]">
          <div className="grid gap-8 lg:grid-cols-[0.5fr_1.5fr] lg:gap-14">
            <div className="lg:sticky lg:top-28 lg:self-start">
               <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#014EB4]">
                 Business information
               </p>
               <h2 className="mt-4 text-3xl font-black leading-[0.98] tracking-tight sm:text-4xl">
                Informasi resmi bisnis POSKART.
              </h2>
              <p className="mt-3 text-sm leading-7 text-zinc-600">
                Detail organisasi dan kontak resmi yang dapat digunakan untuk
                keperluan kerjasama, verifikasi, dan administrasi.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {businessDetails.map((item) => (
                <div
                  key={item.label}
                   className="border-t border-zinc-200 bg-white p-5 first:border-t-0 sm:first:border-t"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
                    {item.label}
                  </div>
                  <div className="mt-2 text-sm font-medium text-zinc-950">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#F7F8FA] px-3 py-16 sm:px-6 sm:py-20 lg:px-10 lg:py-24">
        <div className="mx-auto w-full max-w-[90rem]">
          <div className="flex flex-col items-start justify-between gap-8 rounded-[28px] border border-white/40 bg-[radial-gradient(140%_130%_at_50%_-20%,#5FA8FF_0%,#014EB4_50%,#00357B_100%)] px-6 py-16 text-white shadow-[0_30px_80px_rgba(0,53,123,0.24)] sm:rounded-[36px] sm:px-12 sm:py-20 lg:flex-row lg:items-center lg:py-24">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                Butuh bantuan lebih lanjut?
              </h2>
              <p className="mt-4 text-sm leading-7 text-blue-100 sm:text-base">
                Tim POSKART siap membantu Anda memulai, mengatasi kendala, atau
                mendiskusikan kebutuhan bisnis photobooth Anda.
              </p>
            </div>
            <LandingButton
              variant="primary"
              size="lg"
              className="h-14 rounded-2xl"
              asChild
            >
              <a
                href={`${businessProfile.whatsappUrl}?text=${encodeURIComponent(
                  "Halo POSKART, saya ingin mendapatkan bantuan terkait platform POSKART.",
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                Hubungi via WhatsApp
                <ArrowUpRight className="size-4" />
              </a>
            </LandingButton>
          </div>
        </div>
      </section>

      <PublicFooter className="border-t border-blue-100" />
    </main>
  );
}
