"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PublicMobileNav,
  type PublicNavLink,
} from "@/features/root/shell/public-mobile-nav";

/**
 * Session-aware header actions.
 *
 * The landing page is statically prerendered, so it cannot read the auth
 * cookie on the server. Instead the anonymous layout is rendered immediately
 * (matching the prerendered HTML exactly, so hydration never mismatches) and
 * the signed-in shortcut is swapped in after a lightweight client fetch.
 *
 * Pages that already render dynamically may pass `initialEmail`; they skip the
 * fetch entirely and keep their existing server-rendered behaviour.
 */
export function PublicHeaderActions({
  isLanding,
  links,
  initialEmail = null,
  resolveSession = false,
}: {
  isLanding: boolean;
  links: PublicNavLink[];
  initialEmail?: string | null;
  /** When true, ask the browser for the current session after mount. */
  resolveSession?: boolean;
}) {
  const [email, setEmail] = useState<string | null>(initialEmail);

  useEffect(() => {
    if (!resolveSession) return;

    let cancelled = false;
    const controller = new AbortController();

    fetch("/api/public/session", {
      signal: controller.signal,
      cache: "no-store",
      credentials: "same-origin",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { email?: unknown } | null) => {
        if (cancelled) return;
        setEmail(typeof data?.email === "string" && data.email ? data.email : null);
      })
      .catch(() => {
        // Signed-out is the safe default when the check fails.
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [resolveSession]);

  const initials = email
    ? email.split("@")[0].slice(0, 2).toUpperCase()
    : "PK";

  const primaryClass = isLanding
    ? "rounded-full bg-[#00357B] px-5 text-white hover:bg-[#014EB4]"
    : "rounded-full bg-zinc-950 px-5 text-white hover:bg-zinc-800";

  return (
    <div className="flex items-center gap-2">
      {email ? (
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className={buttonVariants({ size: "sm", className: primaryClass })}
          >
            Dashboard
            <ArrowRight className="size-3.5" />
          </Link>
          <Link
            href="/dashboard"
            aria-label={`Open dashboard as ${email}`}
            title={email}
          >
            <Avatar name={initials} />
          </Link>
        </div>
      ) : (
        <div className={cn("hidden items-center gap-3 lg:flex")}>
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-600 transition-colors hover:text-[#00357B]"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className={buttonVariants({ size: "sm", className: primaryClass })}
          >
            Coba gratis
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}
      <PublicMobileNav links={links} authenticated={Boolean(email)} />
    </div>
  );
}
