import Link from "next/link";
import { ArrowRight, Camera } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { businessProfile, legalLinks } from "@/lib/constants/business";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/#platform", label: "Platform" },
  { href: "/#builder", label: "Builder" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
  { href: "/terms", label: "Terms" },
];

export function PublicHeader() {
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

        <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
          Admin
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </header>
  );
}

export function PublicFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("border-t border-zinc-200 bg-white", className)}>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:px-8">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Logo Poskart.png"
              alt="POSKART Logo"
              className="size-7 object-contain"
            />
          </div>
          <div>
            <div className="text-sm font-semibold">{businessProfile.brandName}</div>
            <div className="text-xs text-zinc-500">SaaS admin for receipt-style photobooths</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-zinc-500 lg:justify-end">
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-zinc-950">
              {link.label}
            </Link>
          ))}
          <Link href="/dashboard" className="hover:text-zinc-950">
            Admin
          </Link>
        </div>
      </div>
      <div className="border-t border-zinc-100">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-zinc-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>{businessProfile.legalName} · {businessProfile.address}</p>
          <p>{businessProfile.email} · {businessProfile.phone}</p>
        </div>
      </div>
    </footer>
  );
}
