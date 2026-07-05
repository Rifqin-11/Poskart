"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  CreditCard,
  Gauge,
  LayoutTemplate,
  Images,
  ListOrdered,
  LockKeyhole,
  Menu,
  MonitorSmartphone,
  Palette,
  PanelsTopLeft,
  ReceiptText,
  Settings,
  Store,
  LogOut,
  Building,
  Shield,
  UserRound,
  Ticket,
  WalletCards,
} from "lucide-react";
import { useState } from "react";
import { useSubscriptionStatus } from "@/features/admin/subscription/use-subscription";
import {
  useTenantDetails,
  useTenantMembers,
} from "@/features/admin/organization/use-organization";
import { useRealtimeSync } from "@/features/admin/hooks/use-realtime-sync";
import {
  useAdminNotifications,
  useMarkAdminNotificationsRead,
} from "@/features/admin/notifications/use-admin-notifications";
import { signOutAction } from "@/app/auth/actions";
import { SubscriptionDialog } from "@/features/billing/subscription/subscription-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { CommandSearch } from "@/components/ui/command";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useBuilderStore } from "@/stores/builder-store";
import {
  normalizeOrganizationFeatures,
  type OrganizationFeatureKey,
} from "@/lib/organization-features";
import { useI18n } from "@/lib/i18n/i18n-provider";
import type { DictionaryKey } from "@/lib/i18n/dictionaries";

type AdminNavItem = {
  href: string;
  labelKey: DictionaryKey;
  icon: React.ComponentType<{ className?: string }>;
  requiresSubscription?: boolean;
  superAdminOnly?: boolean;
  organizationFeature?: OrganizationFeatureKey;
};

const navItems: AdminNavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: Gauge },
  {
    href: "/pos",
    labelKey: "nav.pos",
    icon: PanelsTopLeft,
    requiresSubscription: true,
    organizationFeature: "posKasir",
  },
  {
    href: "/queue",
    labelKey: "nav.queue",
    icon: ListOrdered,
    requiresSubscription: true,
  },
  {
    href: "/money",
    labelKey: "nav.money",
    icon: WalletCards,
    requiresSubscription: true,
    organizationFeature: "money",
  },
  {
    href: "/transactions",
    labelKey: "nav.transactions",
    icon: Store,
    requiresSubscription: true,
  },
  {
    href: "/withdraw",
    labelKey: "nav.withdraw",
    icon: ReceiptText,
    requiresSubscription: true,
  },
  {
    href: "/pricing",
    labelKey: "nav.pricing",
    icon: CreditCard,
    requiresSubscription: true,
  },
  {
    href: "/devices",
    labelKey: "nav.devices",
    icon: MonitorSmartphone,
    requiresSubscription: true,
  },
  {
    href: "/themes",
    labelKey: "nav.themes",
    icon: Palette,
    requiresSubscription: true,
  },
  {
    href: "/templates",
    labelKey: "nav.templates",
    icon: LayoutTemplate,
    requiresSubscription: true,
  },
  {
    href: "/gallery",
    labelKey: "nav.gallery",
    icon: Images,
    requiresSubscription: true,
  },
  {
    href: "/vouchers",
    labelKey: "nav.vouchers",
    icon: Ticket,
    requiresSubscription: true,
  },
  {
    href: "/superadmin",
    labelKey: "nav.superAdmin",
    icon: Shield,
    superAdminOnly: true,
  },
  {
    href: "/settings",
    labelKey: "nav.settings",
    icon: Settings,
    requiresSubscription: true,
  },
];

function formatShortExpiry(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diff = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.round(diff / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

function formatAccountRole(role?: string | null, isSuperAdmin = false) {
  if (isSuperAdmin) return "Super Admin";
  if (!role) return "Member";

  const labels: Record<string, string> = {
    owner: "Owner",
    admin: "Admin",
    partner: "Partner",
    member: "Member",
  };

  return labels[role] ?? role;
}

function SidebarContent({
  isSuperAdmin = false,
  onNavigate,
}: {
  isSuperAdmin?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { t } = useI18n();

  const { data: sub, isLoading } = useSubscriptionStatus();
  const { data: organization, isLoading: isOrganizationLoading } =
    useTenantDetails();
  const organizationName = organization?.name ?? "Organization";
  const expiry =
    formatShortExpiry(organization?.subscription_expires_at) ??
    sub?.expiry ??
    "No expiry";

  const adminMode = isSuperAdmin;
  const hasActiveSubscription = adminMode || Boolean(sub?.isActive);
  const organizationFeatures = normalizeOrganizationFeatures(
    organization?.features,
  );
  const filteredNavItems = navItems.filter((item) => {
    if (item.superAdminOnly && !adminMode) return false;
    if (
      item.organizationFeature &&
      !adminMode &&
      !organizationFeatures[item.organizationFeature]
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Link
        href="/dashboard"
        className="mb-6 flex items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-white/70"
        onClick={onNavigate}
      >
        <div className="grid size-10 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/70">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Logo Poskart.png"
            alt="POSKART Logo"
            className="size-7 object-contain"
          />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight">POSKART</div>
          <div className="text-xs text-zinc-500">Kiosk operating system</div>
        </div>
      </Link>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          const locked = Boolean(
            item.requiresSubscription && !hasActiveSubscription,
          );
          if (locked) {
            return (
              <Link
                key={item.href}
                href={`/settings?tab=organization&subscription=required&next=${encodeURIComponent(item.href)}`}
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-amber-50 hover:text-amber-700"
                title="Requires an active POSKART subscription"
              >
                <Icon className="size-4" />
                <span className="flex-1">{t(item.labelKey)}</span>
                <LockKeyhole className="size-3.5" />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-zinc-600 transition-colors hover:bg-white hover:text-zinc-950 hover:shadow-sm",
                active &&
                  "bg-zinc-950 text-white shadow-lg shadow-zinc-950/10 hover:bg-zinc-950 hover:text-white",
              )}
            >
              <Icon className="size-4" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/settings?tab=organization"
        onClick={onNavigate}
        className={cn(
          "mt-3 shrink-0 rounded-3xl border bg-white/90 p-3.5 shadow-sm shadow-zinc-200/70 transition-colors hover:border-zinc-300 hover:bg-white",
          hasActiveSubscription
            ? "border-emerald-200/80"
            : "border-amber-200/80 bg-amber-50/60",
          pathname === "/settings" && "border-zinc-950 shadow-zinc-950/10",
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-2xl",
              hasActiveSubscription
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700",
            )}
          >
            <Building className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
              {t("common.organization")}
            </div>
            {isLoading || isOrganizationLoading ? (
              <div className="mt-2 h-4 w-28 animate-pulse rounded bg-zinc-100" />
            ) : (
              <>
                <div className="mt-0.5 truncate text-sm font-semibold text-zinc-950">
                  {organizationName}
                </div>
                <div className="mt-1 truncate text-[11px] leading-4 text-zinc-500">
                  <span
                    className={cn(
                      "font-medium",
                      hasActiveSubscription
                        ? "text-emerald-700"
                        : "text-amber-700",
                    )}
                  >
                    {hasActiveSubscription ? t("common.active") : t("common.locked")}
                  </span>
                  <span className="mx-1.5 text-zinc-300">•</span>
                  <span>{t("common.exp")} {expiry}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

export function AdminShell({
  children,
  userEmail,
  userName,
  isSuperAdmin = false,
}: {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
  isSuperAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const { locale, setLocale, t } = useI18n();
  const initials = userEmail?.slice(0, 2).toUpperCase() ?? "PK";
  const builderFullView = useBuilderStore((s) => s.builderFullView);
  const { data: members = [] } = useTenantMembers();
  const currentMember = members.find((member) => member.email === userEmail);
  const accountName = userName || userEmail || "POSKART User";
  const accountRole = formatAccountRole(currentMember?.role, isSuperAdmin);

  // Subscribe to Supabase Realtime so layout_schemas + devices queries
  // auto-refresh when the Flutter kiosk app pushes changes (e.g. active theme)
  useRealtimeSync();

  const { data: notifications = [] } = useAdminNotifications();
  const markRead = useMarkAdminNotificationsRead();
  const unreadNotifications = notifications.filter((n) => !n.readAt);
  const hasUnread = unreadNotifications.length > 0;

  return (
    <div
      className={cn(
        "min-h-screen",
        builderFullView ? "bg-zinc-50" : "bg-[#f5f6f8]",
      )}
    >
      {/* App sidebar — hidden in builder full-view */}
      {!builderFullView && (
        <aside className="fixed inset-y-4 left-4 hidden w-64 overflow-hidden rounded-[2rem] border border-zinc-200/70 bg-white p-4 shadow-xl shadow-zinc-950/[0.05] lg:block xl:w-72">
          <SidebarContent isSuperAdmin={isSuperAdmin} />
        </aside>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SidebarContent
          isSuperAdmin={isSuperAdmin}
          onNavigate={() => setOpen(false)}
        />
      </Sheet>

      <div
        className={cn(
          "transition-all duration-200",
          builderFullView ? "lg:pl-0" : "lg:pl-[17.25rem] xl:pl-[18.75rem]",
        )}
      >
        {/* Topbar — hidden in builder full-view */}
        {!builderFullView && (
          <header className="sticky top-4 z-30 mx-3 mt-4 rounded-[1.75rem] border border-white/75 bg-white/55 px-4 shadow-lg shadow-zinc-950/[0.035] backdrop-blur-2xl backdrop-saturate-150 lg:mx-4 lg:px-5">
            <div className="flex h-16 items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setOpen(true)}
              >
                <Menu />
              </Button>
              <div className="hidden w-full max-w-md md:block">
                <CommandSearch />
              </div>
              <div className="ml-auto flex items-center gap-3">
                <div className="hidden text-right md:block">
                  <div className="text-xs text-zinc-500">
                    {t("topbar.signedInAs")}
                  </div>
                  <div className="max-w-48 truncate text-sm font-medium">
                    {userEmail ?? "POSKART Photobooth"}
                  </div>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    className="relative grid size-10 place-items-center rounded-2xl border border-white/70 bg-white/55 text-zinc-700 shadow-sm backdrop-blur-xl transition-colors hover:bg-white/75 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setNotificationMenuOpen((value) => !value);
                    }}
                    aria-expanded={notificationMenuOpen}
                    aria-haspopup="menu"
                    aria-label="Open notifications"
                    title="Notifications"
                  >
                    <Bell className="size-4" />
                    {hasUnread && (
                      <span className="absolute right-2 top-2 size-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                    )}
                  </button>
                  {notificationMenuOpen ? (
                    <div
                      role="menu"
                      className="fixed inset-x-3 top-24 z-50 max-h-[70vh] overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/95 p-3 shadow-2xl shadow-zinc-950/10 backdrop-blur-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96"
                    >
                      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-2 pb-3">
                        <div>
                          <div className="text-sm font-semibold text-zinc-950">
                            {t("notifications.title")}
                          </div>
                          <div className="mt-0.5 text-xs text-zinc-500">
                            {t("notifications.description")}
                          </div>
                        </div>
                        {hasUnread ? (
                          <button
                            onClick={() => {
                              markRead.mutate(unreadNotifications.map((n) => n.id));
                            }}
                            className="rounded-full bg-zinc-100 hover:bg-zinc-200 transition px-2.5 py-1 text-[11px] font-medium text-zinc-700 shrink-0"
                          >
                            {t("notifications.markAllRead")}
                          </button>
                        ) : (
                          <span className="rounded-full bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-400 shrink-0">
                            {t("notifications.allRead")}
                          </span>
                        )}
                      </div>
                      <div className="max-h-[calc(70vh-5.75rem)] space-y-2 overflow-y-auto py-2 pr-1 [scrollbar-width:thin] sm:max-h-[360px]">
                        {notifications.length === 0 ? (
                          <div className="rounded-2xl bg-zinc-50 px-3 py-3 text-sm">
                            <div className="font-medium text-zinc-950">
                              {t("notifications.emptyTitle")}
                            </div>
                            <div className="mt-1 text-xs leading-5 text-zinc-500">
                              {t("notifications.emptyBody")}
                            </div>
                          </div>
                        ) : (
                          notifications.map((notif) => {
                            const isUnread = !notif.readAt;
                            return (
                              <div
                                key={notif.id}
                                className={cn(
                                  "relative flex flex-col gap-1 rounded-2xl p-3 text-sm transition border",
                                  isUnread
                                    ? "bg-emerald-50/50 border-emerald-100/70 hover:bg-emerald-50/80"
                                    : "bg-white hover:bg-zinc-50 border-zinc-100"
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span className={cn("font-semibold text-zinc-950", isUnread && "text-emerald-950")}>
                                    {notif.title}
                                  </span>
                                  <span className="text-[10px] text-zinc-400 shrink-0">
                                    {formatNotificationTime(notif.createdAt)}
                                  </span>
                                </div>
                                {notif.body && (
                                  <p className="text-xs text-zinc-500 leading-relaxed mt-0.5">
                                    {notif.body}
                                  </p>
                                )}
                                {notif.href && (
                                  <div className="mt-2 flex items-center justify-end">
                                    <Link
                                      href={notif.href}
                                      onClick={() => {
                                        if (isUnread) {
                                          markRead.mutate([notif.id]);
                                        }
                                        setNotificationMenuOpen(false);
                                      }}
                                      className={cn(
                                        buttonVariants({
                                          variant: isUnread ? "default" : "outline",
                                          size: "sm",
                                        }),
                                        "h-7 rounded-xl text-xs px-3 font-medium transition-colors",
                                        isUnread
                                          ? "bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                                          : "text-zinc-600 hover:text-zinc-900"
                                      )}
                                    >
                                      {t("notifications.openDetail")}
                                    </Link>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="relative">
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-full bg-white/35 p-0.5 transition-colors hover:bg-white/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                    onClick={() => {
                      setNotificationMenuOpen(false);
                      setAccountMenuOpen((value) => !value);
                    }}
                    aria-expanded={accountMenuOpen}
                    aria-haspopup="menu"
                    aria-label="Open account menu"
                  >
                    <Avatar name={initials} />
                    <ChevronDown className="size-3.5 text-zinc-500" />
                  </button>
                  {accountMenuOpen ? (
                    <div
                      role="menu"
                      className="absolute right-0 top-12 z-50 w-64 rounded-3xl border border-zinc-200/80 bg-white/95 p-2 shadow-2xl shadow-zinc-950/10 backdrop-blur-xl"
                    >
                      <div className="border-b border-zinc-100 px-3 py-2.5">
                        <div className="truncate text-sm font-medium text-zinc-950">
                          {accountName}
                        </div>
                        <div className="mt-0.5 text-xs text-zinc-500">
                          {accountRole}
                        </div>
                      </div>
                      <div className="py-1">
                        <div className="px-3 py-2">
                          <div className="mb-2 text-[11px] font-medium text-zinc-500">
                            {t("common.language")}
                          </div>
                          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-zinc-100 p-1">
                            <button
                              type="button"
                              className={cn(
                                "rounded-xl px-2 py-1.5 text-xs font-medium text-zinc-600 transition-colors",
                                locale === "en" && "bg-white text-zinc-950 shadow-sm",
                              )}
                              onClick={() => setLocale("en")}
                            >
                              {t("common.english")}
                            </button>
                            <button
                              type="button"
                              className={cn(
                                "rounded-xl px-2 py-1.5 text-xs font-medium text-zinc-600 transition-colors",
                                locale === "id" && "bg-white text-zinc-950 shadow-sm",
                              )}
                              onClick={() => setLocale("id")}
                            >
                              {t("common.indonesian")}
                            </button>
                          </div>
                        </div>
                        <Link
                          href="/settings?tab=organization"
                          role="menuitem"
                          className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          <UserRound className="size-4" />
                          {t("account.preference")}
                        </Link>
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                          onClick={() => {
                            setAccountMenuOpen(false);
                            setSubscriptionDialogOpen(true);
                          }}
                        >
                          <ReceiptText className="size-4" />
                          {t("account.changeSubscription")}
                        </button>
                      </div>
                      <div className="border-t border-zinc-100 pt-1">
                        <form action={signOutAction}>
                          <button
                            type="submit"
                            role="menuitem"
                            className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                          >
                            <LogOut className="size-4" />
                            {t("account.logout")}
                          </button>
                        </form>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </header>
        )}
        <main
          className={cn(
            builderFullView
              ? "p-0"
              : "mx-3 mt-4 px-4 py-5 lg:mx-4 lg:px-5 xl:px-8 xl:py-6",
          )}
        >
          {children}
        </main>
      </div>
      <SubscriptionDialog
        open={subscriptionDialogOpen}
        onOpenChange={setSubscriptionDialogOpen}
      />
    </div>
  );
}
