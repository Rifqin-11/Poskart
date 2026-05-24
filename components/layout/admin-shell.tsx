"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Blocks,
  Camera,
  ChevronDown,
  CreditCard,
  Gauge,
  ImageIcon,
  LayoutTemplate,
  Menu,
  MonitorSmartphone,
  Palette,
  Settings,
  Sparkles,
  Store,
  LogOut,
  Users,
} from "lucide-react";
import { useState } from "react";
import { signOutAction } from "@/app/auth/actions";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CommandSearch } from "@/components/ui/command";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/themes", label: "Themes", icon: Palette },
  { href: "/builder", label: "Builder", icon: Blocks },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/admin/pricing", label: "Pricing", icon: CreditCard },
  { href: "/transactions", label: "Transactions", icon: Store },
  { href: "/booths", label: "Booths", icon: MonitorSmartphone },
  { href: "/assets", label: "Assets", icon: ImageIcon },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/tenants", label: "Tenants", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <Link href="/dashboard" className="mb-6 flex items-center gap-3" onClick={onNavigate}>
        <div className="grid size-9 place-items-center rounded-lg bg-zinc-950 text-white">
          <Camera className="size-4" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight">POSKART</div>
          <div className="text-xs text-zinc-500">Kiosk operating system</div>
        </div>
      </Link>

      <div className="mb-4 rounded-lg border border-zinc-200 bg-white p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-zinc-500">Tenant</div>
            <div className="text-sm font-medium">POSKART Bandung</div>
          </div>
          <ChevronDown className="size-4 text-zinc-400" />
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
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
          18 booths connected, 326 sessions today, QRIS latency stable.
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
  const initials = userEmail?.slice(0, 2).toUpperCase() ?? "PK";

  return (
    <div className="min-h-screen bg-zinc-50">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-zinc-200 bg-zinc-50 p-4 lg:block">
        <SidebarContent />
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </Sheet>

      <div className="lg:pl-72">
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
                <div className="max-w-48 truncate text-sm font-medium">{userEmail ?? "POSKART Admin"}</div>
              </div>
              <Button variant="outline" size="sm">
                Publish
              </Button>
              <form action={signOutAction}>
                <Button variant="ghost" size="icon" type="submit" aria-label="Sign out">
                  <LogOut />
                </Button>
              </form>
              <Avatar name={initials} />
            </div>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
