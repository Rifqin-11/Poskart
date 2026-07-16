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
  { href: "/#features", label: "Features" },
  { href: "/subscriptions", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

export async function PublicHeader({
  variant = "default",
}: {
  variant?: "default" | "landing";
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userEmail =
    typeof data?.claims?.email === "string" ? data.claims.email : null;
  const initials = userEmail
    ? userEmail.split("@")[0].slice(0, 2).toUpperCase()
    : "PK";

  const isLanding = variant === "landing";

  return (
    <header
      className={cn(
        "z-40",
        isLanding
          ? "fixed inset-x-0 top-0 bg-transparent text-zinc-950"
          : "sticky top-0 border-b border-zinc-100 bg-white/85 backdrop-blur-xl",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-[90rem] items-center justify-between px-5 sm:px-8 lg:px-12",
          isLanding
            ? "mt-3 h-14 w-[calc(100%-1.5rem)] rounded-full border border-white/70 bg-white/60 shadow-[0_12px_40px_rgba(24,24,27,0.08)] backdrop-blur-2xl sm:mt-4 sm:w-[calc(100%-2rem)] lg:w-[calc(100%-4rem)]"
            : "h-[72px]",
        )}
      >
        <Link href="/" className="flex items-center gap-3">
          <div
            className={cn(
              "grid size-9 place-items-center overflow-hidden rounded-lg",
              isLanding && "bg-white",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Logo Poskart.png"
              alt="POSKART Logo"
              className="size-7 object-contain"
            />
          </div>
          <div>
            <div
              className={cn(
                "text-sm font-semibold tracking-tight",
                "text-zinc-950",
              )}
            >
              {businessProfile.brandName}
            </div>
            <div
              className={cn(
                "text-[10px] uppercase tracking-[0.16em]",
                "text-zinc-500",
              )}
            >
              Photobooth OS
            </div>
          </div>
        </Link>

        <nav
          className={cn(
            "hidden items-center gap-1 rounded-full p-1 text-xs lg:flex",
            isLanding ? "text-zinc-600" : "text-zinc-500",
          )}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-4 py-2 transition-colors",
                isLanding
                  ? "hover:bg-white/55 hover:text-zinc-950"
                  : "hover:bg-zinc-100 hover:text-zinc-950",
              )}
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
                className: isLanding
                  ? "rounded-full bg-zinc-950 px-5 text-white hover:bg-zinc-700"
                  : "rounded-full bg-zinc-950 px-5 text-white hover:bg-zinc-800",
              })}
            >
              Dashboard
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/dashboard"
              aria-label={`Open dashboard as ${userEmail}`}
              title={userEmail}
            >
              <Avatar name={initials} />
            </Link>
          </div>
        ) : (
          <Link
            href="/login"
            className={buttonVariants({
              size: "sm",
              className: isLanding
                ? "rounded-full bg-zinc-950 px-5 text-white hover:bg-zinc-700"
                : "rounded-full bg-zinc-950 px-5 text-white hover:bg-zinc-800",
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

export function PublicPageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen overflow-clip bg-[#ececea] text-zinc-950">
      <PublicHeader variant="landing" />
      {children}
      <PublicFooter />
    </main>
  );
}

export function PublicFooter({ className }: { className?: string }) {
  const legalLinks = [
    { href: "/terms", label: "Terms of Service" },
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/refund-policy", label: "Refund Policy" },
  ];

  return (
    <footer className={cn("overflow-hidden bg-white", className)}>
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
              <span className="text-sm font-semibold text-zinc-950">
                {businessProfile.brandName}
              </span>
            </div>
            <p className="max-w-xs text-xs leading-5 text-zinc-400">
              SaaS dashboard and visual builder for photobooth kiosks,
              templates, QRIS payments, and operations.
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
            className="text-center font-sans text-7xl font-black uppercase leading-[0.78] tracking-normal text-[#f4f4f5] sm:text-9xl sm:leading-[0.74] lg:text-[13rem] xl:text-[17rem]"
          >
            POSKART
          </div>
        </div>
      </div>
    </footer>
  );
}
