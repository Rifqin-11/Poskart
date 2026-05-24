import Link from "next/link";
import { Building2, Mail, MessageCircle, Phone } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/layout/public-site-shell";
import { buttonVariants } from "@/components/ui/button";
import { businessProfile } from "@/lib/constants/business";

const contacts = [
  { label: "WhatsApp Support", value: businessProfile.whatsapp, href: businessProfile.whatsappUrl, icon: MessageCircle },
  { label: "Support Email", value: businessProfile.email, href: `mailto:${businessProfile.email}`, icon: Mail },
  { label: "Sales Email", value: businessProfile.salesEmail, href: `mailto:${businessProfile.salesEmail}`, icon: Mail },
  { label: "Phone", value: businessProfile.phone, href: businessProfile.whatsappUrl, icon: Phone },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <PublicHeader />
      <section className="border-b border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
            <Building2 className="size-3.5 text-red-500" />
            Contact Center
          </div>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Contact POSKART support and sales.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-600">
            Hubungi POSKART untuk demo, onboarding, billing, QRIS operation, konfigurasi booth,
            dan pertanyaan teknis terkait platform SaaS POSKART.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
        <div className="grid gap-4">
          {contacts.map((contact) => {
            const Icon = contact.icon;
            return (
              <div key={contact.label} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="grid size-11 shrink-0 place-items-center rounded-md bg-zinc-100">
                      <Icon className="size-5 text-zinc-700" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold">{contact.label}</h2>
                      <p className="mt-1 text-sm text-zinc-600">{contact.value}</p>
                    </div>
                  </div>
                  <Link href={contact.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    Open
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="text-lg font-semibold">Business details</h2>
          <div className="mt-5 space-y-4 text-sm leading-7 text-zinc-600">
            <p><span className="font-medium text-zinc-950">Business name:</span> {businessProfile.businessName}</p>
            <p><span className="font-medium text-zinc-950">Legal name:</span> {businessProfile.legalName}</p>
            <p><span className="font-medium text-zinc-950">Address:</span> {businessProfile.address}</p>
            <p><span className="font-medium text-zinc-950">Support hours:</span> {businessProfile.supportHours}</p>
            <p><span className="font-medium text-zinc-950">Website:</span> {businessProfile.domain}</p>
          </div>
          <div className="mt-6 rounded-md bg-white p-4 text-sm leading-6 text-zinc-600">
            Untuk pengajuan payment gateway production, pastikan informasi kontak ini diganti dengan data bisnis aktif dan sesuai dokumen legal sebelum submit.
          </div>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
