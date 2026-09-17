"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PublicNavLink = {
  href: string;
  label: string;
  external?: boolean;
};

export function PublicMobileNav({
  links,
  authenticated = false,
}: {
  links: PublicNavLink[];
  authenticated?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="public-mobile-menu"
        aria-label={open ? "Tutup menu" : "Buka menu"}
        onClick={() => setOpen((current) => !current)}
        className="grid size-9 place-items-center rounded-full text-zinc-700 transition-colors hover:bg-blue-50 hover:text-[#00357B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00357B]"
      >
        {open ? <X className="size-4" /> : <Menu className="size-4" />}
      </button>

      {open ? (
        <div
          id="public-mobile-menu"
          className="absolute inset-x-3 top-[4.25rem] rounded-2xl border border-blue-100 bg-white p-2 shadow-[0_18px_45px_rgba(0,53,123,0.16)]"
        >
          <nav aria-label="Navigasi utama" className="flex flex-col">
            {links.map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-zinc-600 hover:bg-blue-50 hover:text-[#00357B]"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-zinc-600 hover:bg-blue-50 hover:text-[#00357B]"
                >
                  {link.label}
                </Link>
              ),
            )}
            <div className="mt-1 grid gap-2 border-t border-blue-100 p-2 pt-3">
              {authenticated ? (
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className={cn(buttonVariants({ size: "sm" }), "h-10 rounded-xl bg-[#00357B] text-white hover:bg-[#014EB4]")}
                >
                  Buka dashboard
                </Link>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-blue-100 px-3 text-sm font-semibold text-[#00357B]"
                  >
                    Masuk
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className={cn(buttonVariants({ size: "sm" }), "h-10 rounded-xl bg-[#00357B] text-white hover:bg-[#014EB4]")}
                  >
                    Coba gratis
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
