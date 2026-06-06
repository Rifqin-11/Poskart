"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Blocks,
  ChevronDown,
  CreditCard,
  Gauge,
  ImageIcon,
  LayoutTemplate,
  LockKeyhole,
  Menu,
  MonitorSmartphone,
  Palette,
  PanelsTopLeft,
  ReceiptText,
  Settings,
  Sparkles,
  Store,
  LogOut,
  Building,
  Shield,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { useSubscriptionStatus } from "@/features/admin/subscription/use-subscription";
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
  { href: "/pos", label: "POS Kasir", icon: PanelsTopLeft, requiresSubscription: true },
  { href: "/organization", label: "Organization", icon: Building },
  { href: "/themes", label: "Themes", icon: Palette, requiresSubscription: true },
  { href: "/builder", label: "Builder", icon: Blocks, requiresSubscription: true },
  { href: "/templates", label: "Templates", icon: LayoutTemplate, requiresSubscription: true },
  { href: "/pricing", label: "Pricing", icon: CreditCard, requiresSubscription: true },
  { href: "/transactions", label: "Transactions", icon: Store, requiresSubscription: true },
  { href: "/devices", label: "Devices", icon: MonitorSmartphone, requiresSubscription: true },
  { href: "/assets", label: "Assets", icon: ImageIcon, requiresSubscription: true },
  { href: "/analytics", label: "Analytics", icon: BarChart3, requiresSubscription: true },
  { href: "/superadmin", label: "Super Admin", icon: Shield, superAdminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, requiresSubscription: true },
];

function isSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  const adminEmails = ["rifqinaufal9009@gmail.com", "admin@poskart.id", "admin@poskart.my.id"];
  return adminEmails.includes(email.toLowerCase());
}

function SidebarContent({
  userEmail,
  onNavigate,
  onOpenSubscription,
}: {
  userEmail?: string;
  onNavigate?: () => void;
  onOpenSubscription?: () => void;
}) {
  const pathname = usePathname();

  const { data: sub, isLoading } = useSubscriptionStatus();
  const tier = sub?.tier ?? "Free";
  const expiry = sub?.expiry;
  const planName = sub?.planName ?? "Free";
  const deviceLimit = sub?.deviceLimit ?? 1;

  const adminMode = isSuperAdmin(userEmail);
  const hasActiveSubscription = adminMode || tier === "Pro";
  const filteredNavItems = navItems.filter((item) => !item.superAdminOnly || adminMode);

  return (
    <div className="flex h-full flex-col">
      <Link href="/dashboard" className="mb-6 flex items-center gap-3" onClick={onNavigate}>
        <div className="grid size-9 place-items-center overflow-hidden rounded-lg">
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

      <div
        className={cn(
          "mb-4 rounded-lg border bg-white p-3 shadow-sm",
          hasActiveSubscription ? "border-emerald-200" : "border-amber-200 bg-amber-50/50",
        )}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Subscription</div>
            {!isLoading && !hasActiveSubscription ? (
              <LockKeyhole className="size-3.5 text-amber-600" />
            ) : null}
          </div>
          {isLoading ? (
            <div className="h-5 w-24 animate-pulse rounded bg-zinc-100" />
          ) : (
            <div className="space-y-1.5">
              <span
                className={cn(
                  "inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs font-semibold shadow-xs",
                  hasActiveSubscription
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-amber-200 bg-white text-amber-800",
                )}
              >
                {tier === "Pro" ? planName : "Free"} Account
              </span>
              <div className="text-[11px] leading-4 text-zinc-500">
                {deviceLimit} device{deviceLimit > 1 ? "s" : ""} allowed
                {!hasActiveSubscription ? " · Builder locked" : ""}
              </div>
            </div>
          )}
          {!isLoading && (
            expiry ? (
              <div className="text-[11px] text-zinc-500">
                Expires: <span className="font-medium text-zinc-700">{expiry}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onOpenSubscription?.();
                  onNavigate?.();
                }}
                className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-red-600 hover:text-red-700 transition-colors"
              >
                Activate subscription
                <ArrowRight className="size-3" />
              </button>
            )
          )}
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          const locked = Boolean(item.requiresSubscription && !hasActiveSubscription);
          if (locked) {
            return (
              <Link
                key={item.href}
                href={`/organization?subscription=required&next=${encodeURIComponent(item.href)}`}
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-amber-50 hover:text-amber-700"
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
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950",
                active && "bg-zinc-950 text-white hover:bg-zinc-950 hover:text-white",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-red-500" />
          Live network
        </div>
        <div className="text-xs leading-5 text-zinc-500">
          18 devices connected, 326 sessions today, QRIS latency stable.
        </div>
      </div>
    </div>
  );
}

export function AdminShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail?: string;
}) {
  const [open, setOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const initials = userEmail?.slice(0, 2).toUpperCase() ?? "PK";
  const { data: subscription } = useSubscriptionStatus();
  const adminMode = isSuperAdmin(userEmail);
  const canPublish = adminMode || subscription?.tier === "Pro";
  const builderFullView = useBuilderStore((s) => s.builderFullView);

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* App sidebar — hidden in builder full-view */}
      {!builderFullView && (
        <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-zinc-200 bg-zinc-50 p-4 lg:block">
          <SidebarContent userEmail={userEmail} onOpenSubscription={() => setSubscriptionDialogOpen(true)} />
        </aside>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SidebarContent
          userEmail={userEmail}
          onNavigate={() => setOpen(false)}
          onOpenSubscription={() => setSubscriptionDialogOpen(true)}
        />
      </Sheet>

      <div className={cn("transition-all duration-200", builderFullView ? "lg:pl-0" : "lg:pl-72")}>
        {/* Topbar — hidden in builder full-view */}
        {!builderFullView && (
          <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/85 px-4 backdrop-blur-xl lg:px-8">
            <div className="flex h-16 items-center gap-4">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
                <Menu />
              </Button>
              <div className="hidden w-full max-w-md md:block">
                <CommandSearch />
              </div>
              <div className="ml-auto flex items-center gap-3">
                <div className="hidden text-right md:block">
                  <div className="text-xs text-zinc-500">Signed in as</div>
                  <div className="max-w-48 truncate text-sm font-medium">{userEmail ?? "POSKART Photobooth"}</div>
                </div>
                <Button variant="outline" size="sm" disabled={!canPublish}>
                  {!canPublish ? <LockKeyhole className="size-3.5" /> : null}
                  Publish
                </Button>
                <div className="relative">
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-full p-0.5 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                    onClick={() => setAccountMenuOpen((value) => !value)}
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
                      className="absolute right-0 top-12 z-50 w-64 rounded-lg border border-zinc-200 bg-white p-2 shadow-xl"
                    >
                      <div className="border-b border-zinc-100 px-3 py-2">
                        <div className="text-xs text-zinc-500">Signed in as</div>
                        <div className="truncate text-sm font-medium text-zinc-950">
                          {userEmail ?? "POSKART Photobooth"}
                        </div>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/organization"
                          role="menuitem"
                          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          <UserRound className="size-4" />
                          Account preference
                        </Link>
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
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
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
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
        <main className={cn(builderFullView ? "p-0" : "px-4 py-6 lg:px-8")}>{children}</main>
      </div>
      <SubscriptionDialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen} />
    </div>
  );
}
