import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { businessProfile } from "@/lib/constants/business";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const Instagram = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const Tiktok = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const navLinks = [
  { href: "/#platform", label: "Platform" },
  { href: "/#builder", label: "Builder" },
  { href: "/subscriptions", label: "Pricing" },
  { href: "/contact", label: "Contact" },
  { href: "/terms", label: "Terms" },
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
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/85 backdrop-blur-xl">
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
            <div className="text-sm font-semibold tracking-tight">{businessProfile.brandName}</div>
            <div className="text-xs text-zinc-500">Photobooth OS</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-zinc-600 md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-zinc-950">
              {link.label}
            </Link>
          ))}
        </nav>

        {userEmail ? (
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
              Dashboard
              <ArrowRight className="size-4" />
            </Link>
            <Link href="/dashboard" aria-label={`Open dashboard as ${userEmail}`} title={userEmail}>
              <Avatar name={initials} />
            </Link>
          </div>
        ) : (
          <Link href="/login" className={buttonVariants({ size: "sm" })}>
            Login
            <ArrowRight className="size-4" />
          </Link>
        )}
      </div>
    </header>
  );
}

export function PublicFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn("border-t border-zinc-250 bg-white pt-16 pb-0", className)}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main 3-column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12">
          {/* Left Column: Social Buttons and Contact Info */}
          <div className="flex flex-col gap-6">
            <div className="flex gap-3">
              <a
                href="https://instagram.com/poskart.id"
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-950"
                aria-label="Instagram"
              >
                <Instagram className="size-4" />
              </a>
              <a
                href="https://tiktok.com/@poskart.id"
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-950"
                aria-label="TikTok"
              >
                <Tiktok className="size-4" />
              </a>
            </div>
            <div className="space-y-1.5 text-sm text-zinc-500">
              <p>{businessProfile.address}</p>
              <p>
                <a
                  href={`mailto:${businessProfile.email}`}
                  className="hover:text-zinc-950 transition-colors"
                >
                  {businessProfile.email}
                </a>
              </p>
              <p>
                <a
                  href={businessProfile.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-zinc-950 transition-colors"
                >
                  {businessProfile.phone}
                </a>
              </p>
              <p>
                <a
                  href={businessProfile.domain}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-zinc-950 transition-colors"
                >
                  {businessProfile.domain.replace(/^https?:\/\//, "")}
                </a>
              </p>
            </div>
          </div>

          {/* Right Column: Menu */}
          <div className="flex flex-col gap-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Menu
            </span>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li>
                <Link
                  href="/#platform"
                  className="hover:text-zinc-950 transition-colors"
                >
                  Platform
                </Link>
              </li>
              <li>
                <Link
                  href="/#builder"
                  className="hover:text-zinc-950 transition-colors"
                >
                  Builder
                </Link>
              </li>
              <li>
                <Link
                  href="/subscriptions"
                  className="hover:text-zinc-950 transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-zinc-950 transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-200" />

        {/* Copyright and Contact Button */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-sm text-zinc-500 py-6">
          <p>© 2026 {businessProfile.legalName}. All rights reserved.</p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
          >
            Contact Support
          </Link>
        </div>

        {/* Giant POSKART background text at the bottom */}
        <div className="w-full overflow-hidden select-none pb-2 mt-4">
          <h1 className="text-[14vw] font-black text-zinc-100 leading-none tracking-tighter text-center uppercase select-none font-sans">
            POSKART
          </h1>
        </div>
      </div>
    </footer>
  );
}
