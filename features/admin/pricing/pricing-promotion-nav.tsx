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
    <nav aria-label={t("nav.pricingPromotions")} className="mb-6 flex w-fit max-w-full items-center gap-1 rounded-full bg-zinc-100 p-1">
      {[
        { href: "/pricing", label: t("nav.pricingTab"), icon: CreditCard },
        { href: "/vouchers", label: t("nav.vouchers"), icon: Ticket },
      ].map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
          className={cn(
            "inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950",
            pathname === href && "bg-white text-zinc-950 shadow-sm",
          )}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
