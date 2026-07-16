import Link from "next/link";
import { Building2, Mail, MessageCircle, Phone } from "lucide-react";
import { PublicPageShell } from "@/features/root/shell/public-site-shell";
import { buttonVariants } from "@/components/ui/button";
import { businessProfile } from "@/lib/constants/business";

const contacts = [
  {
    label: "WhatsApp Support",
    value: businessProfile.whatsapp,
    href: businessProfile.whatsappUrl,
    icon: MessageCircle,
  },
  {
    label: "Support Email",
    value: businessProfile.email,
    href: `mailto:${businessProfile.email}`,
    icon: Mail,
  },
  {
    label: "Sales Email",
    value: businessProfile.salesEmail,
    href: `mailto:${businessProfile.salesEmail}`,
    icon: Mail,
  },
  {
    label: "Phone",
    value: businessProfile.phone,
    href: businessProfile.whatsappUrl,
    icon: Phone,
  },
];

export default function ContactPage() {
  return (
    <PublicPageShell>
      <section className="mx-auto max-w-[90rem] px-5 pb-16 pt-32 sm:px-8 lg:px-12 lg:pb-24">
        <div className="border-b border-zinc-300 pb-10 lg:pb-14">
          <div className="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            <Building2 className="size-4 text-zinc-950" />
            Contact center
          </div>
          <h1 className="max-w-5xl text-5xl font-black uppercase leading-[0.9] tracking-normal sm:text-7xl lg:text-8xl">
            Talk to the team behind your booth.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-600">
            Hubungi POSKART untuk onboarding, billing, QRIS operation,
            konfigurasi booth, dan pertanyaan teknis terkait platform SaaS
            POSKART.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-3">
            {contacts.map((contact) => {
              const Icon = contact.icon;
              return (
                <div
                  key={contact.label}
                  className="border border-zinc-300 bg-white p-5 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="grid size-11 shrink-0 place-items-center rounded-full bg-zinc-100">
                        <Icon className="size-5 text-zinc-950" />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold">
                          {contact.label}
                        </h2>
                        <p className="mt-1 text-sm text-zinc-600">
                          {contact.value}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={contact.href}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                        className: "rounded-full",
                      })}
                    >
                      Open
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border border-zinc-300 bg-white p-6 sm:p-8">
            <h2 className="text-xl font-semibold">Business details</h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-zinc-600">
              <p>
                <span className="font-medium text-zinc-950">
                  Business name:
                </span>{" "}
                {businessProfile.businessName}
              </p>
              <p>
                <span className="font-medium text-zinc-950">Legal name:</span>{" "}
                {businessProfile.legalName}
              </p>
              <p>
                <span className="font-medium text-zinc-950">Address:</span>{" "}
                {businessProfile.address}
              </p>
              <p>
                <span className="font-medium text-zinc-950">
                  Support hours:
                </span>{" "}
                {businessProfile.supportHours}
              </p>
              <p>
                <span className="font-medium text-zinc-950">Website:</span>{" "}
                {businessProfile.domain}
              </p>
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
