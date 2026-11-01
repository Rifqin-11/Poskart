"use client";

import Link from "next/link";
import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { useSubscriptionStatus } from "@/features/admin/subscription/use-subscription";
import { useTenantDetails } from "@/features/admin/organization/use-organization";
import { OrganizationStatusCarousel } from "./organization-status-carousel";
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
        {filteredNavItems.map((item, index) => {
          const Icon = item.icon;
          const active = item.activeHrefs
            ? item.activeHrefs.includes(pathname)
            : pathname === item.href;
          const previousItem = filteredNavItems[index - 1];
          const showDivider = previousItem && previousItem.section !== item.section;

          return (
            <Fragment key={item.href}>
              {showDivider ? (
                <div
                  aria-hidden="true"
                  className="my-2 shrink-0 border-t border-zinc-200/80"
                />
              ) : null}
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-zinc-600 transition-colors hover:bg-white hover:text-zinc-950 hover:shadow-sm",
                  active &&
                    "bg-zinc-950 text-white shadow-md shadow-zinc-950/10 hover:bg-zinc-950 hover:text-white",
                )}
              >
                <Icon className="size-4" />
                {t(item.labelKey)}
              </Link>
            </Fragment>
          );
        })}
      </nav>
       <OrganizationStatusCarousel
         hasActiveSubscription={hasActiveSubscription}
         subscriptionStatus={sub?.status}
         planName={sub?.planName}
         expiry={expiry}
         loading={isLoading || isOrganizationLoading}
         onNavigate={onNavigate}
       />
    </div>
  );
}
