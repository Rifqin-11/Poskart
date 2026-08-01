import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  Mail,
  MessageCircle,
  Phone,
} from "lucide-react";
import { PublicFooter, PublicHeader } from "@/features/root/shell/public-site-shell";
import { buttonVariants } from "@/components/ui/button";
import { businessProfile } from "@/lib/constants/business";

const contacts = [
  {
    label: "WhatsApp Support",
    value: businessProfile.whatsapp,
    href: businessProfile.whatsappUrl,
    icon: MessageCircle,
    description: "Respons cepat untuk pertanyaan teknis dan operasional.",
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
  {
    label: "Phone",
    value: businessProfile.phone,
    href: businessProfile.whatsappUrl,
    icon: Phone,
    description: "Tersedia pada jam operasional.",
    cta: "Hubungi",
    color: "bg-amber-50 text-amber-700",
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
      <section className="hero-gradient-poskart border-b border-blue-100 px-5 pb-16 pt-28 sm:px-8 sm:pb-20 sm:pt-32 lg:px-12">
        <div className="mx-auto max-w-[90rem]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00357B]">
            Contact center
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black uppercase leading-[0.9] tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
            Talk to the team behind your booth.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-zinc-600">
            Hubungi POSKART untuk onboarding, billing, QRIS operation,
            konfigurasi booth, dan pertanyaan teknis terkait platform.
          </p>
        </div>
      </section>

      {/* Contact cards */}
      <section className="bg-white px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-[90rem]">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {contacts.map((contact) => {
              const Icon = contact.icon;
              return (
                <div
                  key={contact.label}
                  className="group flex flex-col overflow-hidden rounded-[24px] border border-zinc-200 bg-white transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(15,23,42,0.09)]"
                >
                  <div className="flex-1 p-6">
                    <div className={`inline-grid size-11 place-items-center rounded-2xl ${contact.color}`}>
                      <Icon className="size-5" />
                    </div>
                    <h2 className="mt-4 font-semibold text-zinc-950">
                      {contact.label}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-zinc-500">
                      {contact.value}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      {contact.description}
                    </p>
                  </div>
                  <div className="border-t border-zinc-100 px-6 py-4">
                    <Link
                      href={contact.href}
                      target={contact.href.startsWith("http") ? "_blank" : undefined}
                      rel={contact.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#00357B] transition hover:opacity-70"
                    >
                      {contact.cta}
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Business details */}
      <section className="border-y border-blue-100 bg-[#f7f9ff] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-[90rem]">
          <div className="grid gap-8 lg:grid-cols-[0.5fr_1.5fr] lg:gap-14">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-sm font-semibold text-[#00357B]">
                Business information
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
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
                  className="overflow-hidden rounded-[20px] border border-blue-100 bg-white p-5 shadow-[0_4px_16px_rgba(0,53,123,0.05)]"
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
      <section className="cta-gradient-poskart px-5 py-16 text-white sm:px-8 lg:px-12 lg:py-20">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Butuh bantuan lebih lanjut?
            </h2>
            <p className="mt-4 text-sm leading-7 text-blue-100 sm:text-base">
              Tim POSKART siap membantu Anda memulai, mengatasi kendala, atau
              mendiskusikan kebutuhan bisnis photobooth Anda.
            </p>
          </div>
          <a
            href={`${businessProfile.whatsappUrl}?text=${encodeURIComponent(
              "Halo POSKART, saya ingin mendapatkan bantuan terkait platform POSKART.",
            )}`}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({
              size: "lg",
              className:
                "h-12 rounded-full bg-white px-6 text-[#00357B] hover:bg-blue-50",
            })}
          >
            Hubungi via WhatsApp
            <ArrowUpRight className="size-4" />
          </a>
        </div>
      </section>

      <PublicFooter className="border-t border-blue-100" />
    </main>
  );
}
