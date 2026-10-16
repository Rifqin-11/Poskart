"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Ticket } from "lucide-react";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn } from "@/lib/utils";

export function PricingPromotionNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav
      aria-label={t("nav.pricingPromotions")}
      className="mb-6 flex w-full items-stretch gap-2"
    >
      <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1 overflow-x-auto rounded-full border border-black/5 bg-[#e9ebef]/90 p-1 backdrop-blur-md [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[
          { href: "/pricing", label: t("nav.pricingTab"), icon: CreditCard },
          { href: "/vouchers", label: t("nav.vouchers"), icon: Ticket },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className={cn(
              "relative isolate inline-flex h-9 min-w-[150px] flex-1 shrink-0 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full px-3 text-sm font-semibold tracking-tight transition-[background-color,filter,transform,box-shadow] duration-200 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(140%_80%_at_50%_0%,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0)_55%)] before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#014EB4]/30",
              pathname === href
                ? "border border-t-transparent border-b-white/60 bg-[#014EB4] text-white shadow-[0_10px_24px_rgba(1,78,180,0.3)] hover:bg-[#00357B]"
                : "border border-black/5 bg-white/55 text-zinc-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_10px_rgba(15,23,42,0.08)] hover:bg-white hover:text-[#00357B]",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
