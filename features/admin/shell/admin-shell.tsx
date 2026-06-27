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
import { useTenantDetails } from "@/features/admin/organization/use-organization";
import { useRealtimeSync } from "@/features/admin/hooks/use-realtime-sync";
import { signOutAction } from "@/app/auth/actions";
import { SubscriptionDialog } from "@/features/billing/subscription/subscription-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CommandSearch } from "@/components/ui/command";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useBuilderStore } from "@/stores/builder-store";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  {
    href: "/pos",
    label: "POS Kasir",
    icon: PanelsTopLeft,
    requiresSubscription: true,
  },
  {
    href: "/money",
    label: "Keuangan",
    icon: WalletCards,
    requiresSubscription: true,
  },
  {
    href: "/themes",
    label: "Themes",
    icon: Palette,
    requiresSubscription: true,
  },
  {
    href: "/templates",
    label: "Templates",
    icon: LayoutTemplate,
    requiresSubscription: true,
  },
  {
    href: "/pricing",
    label: "Pricing",
    icon: CreditCard,
    requiresSubscription: true,
  },
  {
    href: "/transactions",
    label: "Transactions",
    icon: Store,
    requiresSubscription: true,
  },
  {
    href: "/gallery",
    label: "Gallery",
    icon: Images,
    requiresSubscription: true,
  },
  {
    href: "/devices",
    label: "Devices",
    icon: MonitorSmartphone,
    requiresSubscription: true,
  },
  {
    href: "/vouchers",
    label: "Vouchers",
    icon: Ticket,
    requiresSubscription: true,
  },
  {
    href: "/superadmin",
    label: "Super Admin",
    icon: Shield,
    superAdminOnly: true,
  },
  {
    href: "/settings",
    label: "Settings",
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

function SidebarContent({
  isSuperAdmin = false,
  onNavigate,
}: {
  isSuperAdmin?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const { data: sub, isLoading } = useSubscriptionStatus();
  const { data: organization, isLoading: isOrganizationLoading } =
    useTenantDetails();
  const tier = sub?.tier ?? "Free";
  const organizationName = organization?.name ?? "Organization";
  const expiry =
    formatShortExpiry(organization?.subscription_expires_at) ??
    sub?.expiry ??
    "No expiry";

  const adminMode = isSuperAdmin;
  const hasActiveSubscription = adminMode || tier === "Pro";
  const filteredNavItems = navItems.filter(
    (item) => !item.superAdminOnly || adminMode,
  );

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
                href={`/organization?subscription=required&next=${encodeURIComponent(item.href)}`}
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-amber-50 hover:text-amber-700"
                title="Requires an active POSKART subscription"
              >
                <Icon className="size-4" />
                <span className="flex-1">{item.label}</span>
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
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/organization"
        onClick={onNavigate}
        className={cn(
          "mt-3 shrink-0 rounded-3xl border bg-white/90 p-3.5 shadow-sm shadow-zinc-200/70 transition-colors hover:border-zinc-300 hover:bg-white",
          hasActiveSubscription
            ? "border-emerald-200/80"
            : "border-amber-200/80 bg-amber-50/60",
          pathname === "/organization" && "border-zinc-950 shadow-zinc-950/10",
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
              Organization
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
                    {hasActiveSubscription ? "Active" : "Locked"}
                  </span>
                  <span className="mx-1.5 text-zinc-300">•</span>
                  <span>Exp {expiry}</span>
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
  isSuperAdmin = false,
}: {
  children: React.ReactNode;
  userEmail?: string;
  isSuperAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const initials = userEmail?.slice(0, 2).toUpperCase() ?? "PK";
  const builderFullView = useBuilderStore((s) => s.builderFullView);

  // Subscribe to Supabase Realtime so layout_schemas + devices queries
  // auto-refresh when the Flutter kiosk app pushes changes (e.g. active theme)
  useRealtimeSync();

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
                  <div className="text-xs text-zinc-500">Signed in as</div>
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
                    <span className="absolute right-2 top-2 size-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </button>
                  {notificationMenuOpen ? (
                    <div
                      role="menu"
                      className="absolute right-0 top-12 z-50 w-80 rounded-3xl border border-zinc-200/80 bg-white/95 p-3 shadow-2xl shadow-zinc-950/10 backdrop-blur-xl"
                    >
                      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-2 pb-3">
                        <div>
                          <div className="text-sm font-semibold text-zinc-950">
                            Notifications
                          </div>
                          <div className="mt-0.5 text-xs text-zinc-500">
                            Ringkasan aktivitas POSKART terbaru.
                          </div>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                          Active
                        </span>
                      </div>
                      <div className="py-2">
                        <div className="rounded-2xl bg-zinc-50 px-3 py-3 text-sm">
                          <div className="font-medium text-zinc-950">
                            Tidak ada notifikasi penting
                          </div>
                          <div className="mt-1 text-xs leading-5 text-zinc-500">
                            Semua layanan dashboard berjalan normal. Notifikasi
                            transaksi, device, dan print job akan tampil di
                            sini.
                          </div>
                        </div>
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
                        <div className="text-xs text-zinc-500">
                          Signed in as
                        </div>
                        <div className="truncate text-sm font-medium text-zinc-950">
                          {userEmail ?? "POSKART Photobooth"}
                        </div>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/organization"
                          role="menuitem"
                          className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          <UserRound className="size-4" />
                          Account preference
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
                          Change subscription
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
                            Logout
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
