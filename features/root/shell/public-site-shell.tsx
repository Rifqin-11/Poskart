import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { businessProfile } from "@/lib/constants/business";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/#platform", label: "Platform" },
  { href: "/#builder", label: "Builder" },
  { href: "/subscriptions", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

export async function PublicHeader() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userEmail = typeof data?.claims?.email === "string" ? data.claims.email : null;
  const initials = userEmail
    ? userEmail
        .split("@")[0]
        .slice(0, 2)
        .toUpperCase()
    : "PK";

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-100 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid size-9 place-items-center overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Logo Poskart.png"
              alt="POSKART Logo"
              className="size-7 object-contain"
            />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-zinc-950">{businessProfile.brandName}</div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-400">Photobooth OS</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-zinc-500 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-zinc-950"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {userEmail ? (
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className={buttonVariants({
                size: "sm",
                className:
                  "rounded-full bg-zinc-950 px-5 text-white hover:bg-zinc-800",
              })}
            >
              Dashboard
              <ArrowRight className="size-3.5" />
            </Link>
            <Link href="/dashboard" aria-label={`Open dashboard as ${userEmail}`} title={userEmail}>
              <Avatar name={initials} />
            </Link>
          </div>
        ) : (
          <Link
            href="/login"
            className={buttonVariants({
              size: "sm",
              className:
                "rounded-full bg-zinc-950 px-5 text-white hover:bg-zinc-800",
            })}
          >
            Login
            <ArrowRight className="size-3.5" />
          </Link>
        )}
      </div>
    </header>
  );
}

export function PublicFooter({ className }: { className?: string }) {
  const legalLinks = [
    { href: "/terms", label: "Terms of Service" },
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/refund-policy", label: "Refund Policy" },
  ];

  return (
    <footer
      className={cn("overflow-hidden bg-white", className)}
    >
      <div className="section-divider" />
      <div className="mx-auto flex min-h-[300px] max-w-7xl flex-col px-4 py-8 sm:min-h-[360px] sm:px-6 lg:min-h-[384px] lg:px-8">
        <div className="flex flex-col gap-6 text-sm text-zinc-500 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/Logo Poskart.png"
                alt="POSKART Logo"
                className="size-6 object-contain"
              />
              <span className="text-sm font-semibold text-zinc-950">{businessProfile.brandName}</span>
            </div>
            <p className="max-w-xs text-xs leading-5 text-zinc-400">
              SaaS dashboard dan visual builder untuk mengelola photobooth kiosk, template, QRIS, dan analytics.
            </p>
            <p className="mt-4 text-xs text-zinc-400">
              © 2026 {businessProfile.legalName}. All rights reserved.
            </p>
          </div>
          <div className="flex flex-col items-start gap-4 sm:items-end">
            <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
              {legalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition-colors hover:text-zinc-950"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <Link
              href="/contact"
              className="inline-flex h-10 w-fit items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-900 shadow-[0_1px_2px_rgba(24,24,27,0.02)] transition-colors hover:bg-zinc-50"
            >
              Contact Support
            </Link>
          </div>
        </div>

        <div className="mt-auto w-full select-none overflow-hidden pt-16 sm:pt-20">
          <div
            aria-hidden="true"
            className="text-center font-sans text-[clamp(5.75rem,21vw,17rem)] font-black uppercase leading-[0.78] tracking-[-0.085em] text-[#f4f4f5] sm:leading-[0.74]"
          >
            POSKART
          </div>
        </div>
      </div>
    </footer>
  );
}
