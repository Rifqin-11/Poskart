"use client";

import Link from "next/link";
import { Building, LockKeyhole } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSubscriptionStatus } from "@/features/admin/subscription/use-subscription";
import { useTenantDetails } from "@/features/admin/organization/use-organization";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { normalizeOrganizationFeatures } from "@/lib/organization-features";
import { cn } from "@/lib/utils";
import { adminNavItems } from "./admin-nav-items";

function formatShortExpiry(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" });
}

export function AdminSidebar({ isSuperAdmin = false, onNavigate }: { isSuperAdmin?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { data: sub, isLoading } = useSubscriptionStatus();
  const { data: organization, isLoading: isOrganizationLoading } = useTenantDetails();
  const organizationName = organization?.name ?? "Organization";
  const expiry = formatShortExpiry(organization?.subscription_expires_at) ?? sub?.expiry ?? "No expiry";
  const hasActiveSubscription = isSuperAdmin || Boolean(sub?.isActive);
  const organizationFeatures = normalizeOrganizationFeatures(organization?.features);
  const filteredNavItems = adminNavItems.filter((item) => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.organizationFeature && !organizationFeatures[item.organizationFeature]) return false;
    return true;
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Link href="/dashboard" data-admin-tour="brand" className="mb-6 flex items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-white/70" onClick={onNavigate}>
        <div className="grid size-10 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/70">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.webp" alt="POSKART Logo" className="size-7 object-contain" />
        </div>
        <div><div className="text-sm font-semibold tracking-tight">POSKART</div><div className="text-xs text-zinc-500">Kiosk operating system</div></div>
      </Link>
      <nav data-admin-tour="navigation" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
        {filteredNavItems.map((item) => { const Icon = item.icon; const active = item.activeHrefs ? item.activeHrefs.includes(pathname) : pathname === item.href; const locked = Boolean(item.requiresSubscription && !hasActiveSubscription); return locked ? (
          <Link key={item.href} href={`/settings?tab=organization&subscription=required&next=${encodeURIComponent(item.href)}`} onClick={onNavigate} className="flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-amber-50 hover:text-amber-700" title="Requires an active POSKART subscription"><Icon className="size-4" /><span className="flex-1">{t(item.labelKey)}</span><LockKeyhole className="size-3.5" /></Link>
        ) : <Link key={item.href} href={item.href} onClick={onNavigate} className={cn("flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-zinc-600 transition-colors hover:bg-white hover:text-zinc-950 hover:shadow-sm", active && "bg-zinc-950 text-white shadow-lg shadow-zinc-950/10 hover:bg-zinc-950 hover:text-white")}><Icon className="size-4" />{t(item.labelKey)}</Link>; })}
      </nav>
      <Link href="/settings?tab=organization" data-admin-tour="organization" onClick={onNavigate} className={cn("mt-3 shrink-0 rounded-3xl border bg-white/90 p-3.5 shadow-sm shadow-zinc-200/70 transition-colors hover:border-zinc-300 hover:bg-white", hasActiveSubscription ? "border-emerald-200/80" : "border-amber-200/80 bg-amber-50/60", pathname === "/settings" && "border-zinc-950 shadow-zinc-950/10")}>
        <div className="flex items-start gap-3"><div className={cn("grid size-9 shrink-0 place-items-center rounded-2xl", hasActiveSubscription ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}><Building className="size-4" /></div><div className="min-w-0 flex-1"><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">{t("common.organization")}</div>{isLoading || isOrganizationLoading ? <div className="mt-2 h-4 w-28 animate-pulse rounded bg-zinc-100" /> : <><div className="mt-0.5 truncate text-sm font-semibold text-zinc-950">{organizationName}</div><div className="mt-1 truncate text-[11px] leading-4 text-zinc-500"><span className={cn("font-medium", hasActiveSubscription ? "text-emerald-700" : "text-amber-700")}>{hasActiveSubscription ? sub?.status === "trialing" ? "Trial" : t("common.active") : t("common.locked")}</span><span className="mx-1.5 text-zinc-300">•</span><span>{t("common.exp")} {expiry}</span></div></>}</div></div>
      </Link>
    </div>
  );
}
