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
      <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1 overflow-x-auto rounded-full bg-zinc-100 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[
          { href: "/pricing", label: t("nav.pricingTab"), icon: CreditCard },
          { href: "/vouchers", label: t("nav.vouchers"), icon: Ticket },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className={cn(
              "inline-flex h-9 min-w-[150px] flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 text-sm font-medium text-zinc-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00357B]/20",
              pathname === href
                ? "bg-white text-zinc-950 shadow-sm"
                : "bg-transparent text-zinc-500 hover:text-zinc-900",
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
