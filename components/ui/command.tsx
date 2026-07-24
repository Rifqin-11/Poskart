"use client";

import {
  ArrowUpRight,
  CreditCard,
  FileDown,
  Gauge,
  Images,
  LayoutTemplate,
  ListOrdered,
  LoaderCircle,
  MonitorSmartphone,
  Palette,
  ReceiptText,
  Search,
  Settings,
  Shield,
  Store,
  Ticket,
  WalletCards,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  type ComponentType,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePermission } from "@/features/admin/hooks/use-permission";
import { useTenantDetails } from "@/features/admin/organization/use-organization";
import { searchWorkspace } from "@/features/admin/search/api";
import type {
  GlobalSearchResult,
  GlobalSearchResultKind,
} from "@/features/admin/search/types";
import { useSubscriptionStatus } from "@/features/admin/subscription/use-subscription";
import {
  normalizeOrganizationFeatures,
  type OrganizationFeatureKey,
} from "@/lib/organization-features";
import { cn } from "@/lib/utils";

type SearchItem = {
  key: string;
  title: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

type PageItem = SearchItem & {
  keywords: string;
  requiresSubscription?: boolean;
  superAdminOnly?: boolean;
  organizationFeature?: OrganizationFeatureKey;
};

const pages: PageItem[] = [
  {
    key: "page-dashboard",
    title: "Dashboard",
    description: "Statistics and workspace overview",
    href: "/dashboard",
    keywords: "dashboard statistics overview ringkasan",
    icon: Gauge,
  },
  {
    key: "page-queue",
    title: "Queue",
    description: "Photobooth customer queue",
    href: "/queue",
    keywords: "queue antrean antrian",
    requiresSubscription: true,
    icon: ListOrdered,
  },
  {
    key: "page-money",
    title: "Finance",
    description: "Income and expense records",
    href: "/money",
    keywords: "finance money keuangan pemasukan pengeluaran",
    requiresSubscription: true,
    organizationFeature: "money",
    icon: WalletCards,
  },
  {
    key: "page-transactions",
    title: "Transactions",
    description: "Payments, print records, and exports",
    href: "/transactions",
    keywords: "transaction payment print transaksi pembayaran export",
    requiresSubscription: true,
    icon: Store,
  },
  {
    key: "page-withdraw",
    title: "Withdraw",
    description: "Payout and withdrawal requests",
    href: "/withdraw",
    keywords: "withdraw payout pencairan penarikan",
    requiresSubscription: true,
    icon: ReceiptText,
  },
  {
    key: "page-pricing",
    title: "Pricing",
    description: "Packages and pricing rules",
    href: "/pricing",
    keywords: "pricing packages harga paket",
    requiresSubscription: true,
    icon: CreditCard,
  },
  {
    key: "page-devices",
    title: "Devices",
    description: "Booth configuration and status",
    href: "/devices",
    keywords: "devices booth kiosk perangkat",
    requiresSubscription: true,
    icon: MonitorSmartphone,
  },
  {
    key: "page-themes",
    title: "Themes",
    description: "Kiosk visual themes",
    href: "/themes",
    keywords: "themes visual layout tema tampilan",
    requiresSubscription: true,
    icon: Palette,
  },
  {
    key: "page-templates",
    title: "Templates",
    description: "Photo frame templates",
    href: "/templates",
    keywords: "templates frame bingkai",
    requiresSubscription: true,
    icon: LayoutTemplate,
  },
  {
    key: "page-gallery",
    title: "Gallery",
    description: "Session photos and Live Photos",
    href: "/gallery",
    keywords: "gallery photo live photos galeri foto",
    requiresSubscription: true,
    icon: Images,
  },
  {
    key: "page-vouchers",
    title: "Vouchers",
    description: "Voucher campaigns and allocations",
    href: "/vouchers",
    keywords: "vouchers codes campaign kupon kode",
    requiresSubscription: true,
    icon: Ticket,
  },
  {
    key: "page-superadmin",
    title: "Super Admin",
    description: "Platform administration",
    href: "/superadmin",
    keywords: "super admin platform",
    superAdminOnly: true,
    icon: Shield,
  },
  {
    key: "page-settings",
    title: "Settings",
    description: "Organization, billing, and application settings",
    href: "/settings",
    keywords: "settings organization billing pengaturan organisasi",
    requiresSubscription: true,
    icon: Settings,
  },
];

const resultIcons: Record<
  GlobalSearchResultKind,
  ComponentType<{ className?: string }>
> = {
  transaction: ReceiptText,
  device: MonitorSmartphone,
  gallery: Images,
  voucher: Ticket,
  template: LayoutTemplate,
  theme: Palette,
};

const resultGroupLabels: Record<GlobalSearchResultKind, string> = {
  transaction: "Transactions",
  device: "Devices",
  gallery: "Gallery",
  voucher: "Vouchers",
  template: "Templates",
  theme: "Themes",
};

function useDebouncedValue(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debounced;
}

function toSearchItem(result: GlobalSearchResult): SearchItem {
  return {
    key: `${result.kind}-${result.id}`,
    title: result.title,
    description: result.description,
    href: result.href,
    icon: resultIcons[result.kind],
  };
}

export function CommandSearch({
  isSuperAdmin = false,
}: {
  isSuperAdmin?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { isOwnerOrAdmin } = usePermission();
  const { data: subscription } = useSubscriptionStatus();
  const { data: organization } = useTenantDetails();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const debouncedQuery = useDebouncedValue(query.trim());
  const organizationFeatures = normalizeOrganizationFeatures(
    organization?.features,
  );
  const hasActiveSubscription =
    isSuperAdmin || Boolean(subscription?.isActive);

  const visiblePages = useMemo(
    () =>
      pages
        .filter((page) => {
          if (page.superAdminOnly && !isSuperAdmin) return false;
          if (
            page.organizationFeature &&
            !isSuperAdmin &&
            !organizationFeatures[page.organizationFeature]
          ) {
            return false;
          }
          return true;
        })
        .map((page) => {
          if (!page.requiresSubscription || hasActiveSubscription) return page;
          const params = new URLSearchParams({
            tab: "organization",
            subscription: "required",
            next: page.href,
          });
          return {
            ...page,
            href: `/settings?${params.toString()}`,
            description: `${page.description} · Requires active subscription`,
          };
        }),
    [hasActiveSubscription, isSuperAdmin, organizationFeatures],
  );

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const pageResults = useMemo(() => {
    if (!normalizedQuery) return visiblePages.slice(0, 6);
    return visiblePages.filter((page) =>
      `${page.title} ${page.description} ${page.keywords}`
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
  }, [normalizedQuery, visiblePages]);

  const quickActions = useMemo<SearchItem[]>(() => {
    if (!hasActiveSubscription) return [];
    const actions: SearchItem[] = [
      {
        key: "action-export-transactions",
        title: "Export transactions",
        description: "Open transaction export options",
        href: "/transactions?action=export",
        icon: FileDown,
      },
    ];

    if (isOwnerOrAdmin) {
      actions.unshift(
        {
          key: "action-add-device",
          title: "Add device",
          description: "Register a new photobooth device",
          href: "/devices?action=create",
          icon: MonitorSmartphone,
        },
        {
          key: "action-generate-voucher",
          title: "Generate voucher",
          description: "Create and allocate voucher codes",
          href: "/vouchers?action=generate",
          icon: Ticket,
        },
      );
    }
    return actions;
  }, [hasActiveSubscription, isOwnerOrAdmin]);

  const filteredActions = useMemo(() => {
    if (!normalizedQuery) return quickActions;
    return quickActions.filter((action) =>
      `${action.title} ${action.description}`
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
  }, [normalizedQuery, quickActions]);

  const dynamicSearch = useQuery({
    queryKey: ["global-search", debouncedQuery.toLocaleLowerCase()],
    queryFn: ({ signal }) => searchWorkspace(debouncedQuery, signal),
    enabled:
      open &&
      hasActiveSubscription &&
      debouncedQuery.length >= 2,
  });

  const dynamicGroups = useMemo(() => {
    const grouped = new Map<GlobalSearchResultKind, SearchItem[]>();
    for (const result of dynamicSearch.data?.results ?? []) {
      const items = grouped.get(result.kind) ?? [];
      items.push(toSearchItem(result));
      grouped.set(result.kind, items);
    }
    return grouped;
  }, [dynamicSearch.data?.results]);

  const allItems = useMemo(
    () => [
      ...filteredActions,
      ...pageResults,
      ...Array.from(dynamicGroups.values()).flat(),
    ],
    [dynamicGroups, filteredActions, pageResults],
  );
  const resolvedActiveIndex =
    allItems.length === 0
      ? 0
      : Math.min(activeIndex, allItems.length - 1);

  function closeSearch() {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }

  const openSearch = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [openSearch]);

  useEffect(() => {
    if (!open) return;
    const focusFrame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(focusFrame);
    };
  }, [open]);

  function navigate(item: SearchItem) {
    if (!item.href.startsWith("/")) return;
    closeSearch();
    router.push(item.href);
  }

  function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSearch();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        allItems.length === 0 ? 0 : (current + 1) % allItems.length,
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        allItems.length === 0
          ? 0
          : (current - 1 + allItems.length) % allItems.length,
      );
      return;
    }
    if (event.key === "Enter" && allItems[resolvedActiveIndex]) {
      event.preventDefault();
      navigate(allItems[resolvedActiveIndex]);
    }
  }

  function renderItems(items: SearchItem[]) {
    return items.map((item) => {
      const Icon = item.icon;
      const itemIndex = allItems.findIndex(
        (candidate) => candidate.key === item.key,
      );
      const active = itemIndex === resolvedActiveIndex;
      return (
        <button
          key={item.key}
          type="button"
          role="option"
          aria-selected={active}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors",
            active ? "bg-zinc-950 text-white" : "hover:bg-zinc-100",
          )}
          onMouseEnter={() => setActiveIndex(itemIndex)}
          onClick={() => navigate(item)}
        >
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-xl",
              active
                ? "bg-white/15 text-white"
                : "bg-zinc-100 text-zinc-600",
            )}
          >
            <Icon className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {item.title}
            </span>
            <span
              className={cn(
                "mt-0.5 block truncate text-xs",
                active ? "text-white/65" : "text-zinc-500",
              )}
            >
              {item.description}
            </span>
          </span>
          <ArrowUpRight
            className={cn(
              "size-3.5 shrink-0",
              active ? "text-white/60" : "text-zinc-300",
            )}
          />
        </button>
      );
    });
  }

  const hasDynamicResults = Array.from(dynamicGroups.values()).some(
    (items) => items.length > 0,
  );
  const waitingForMinimumQuery =
    normalizedQuery.length > 0 && normalizedQuery.length < 2;
  const showNoResults =
    debouncedQuery.length >= 2 &&
    !dynamicSearch.isFetching &&
    !dynamicSearch.isError &&
    pageResults.length === 0 &&
    filteredActions.length === 0 &&
    !hasDynamicResults;

  return (
    <>
      <button
        type="button"
        onClick={openSearch}
        className="flex h-9 w-full min-w-0 items-center gap-2 rounded-xl border border-white/70 bg-white/25 px-3 text-left text-sm text-zinc-400 shadow-sm shadow-zinc-950/[0.03] backdrop-blur-xl transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
        aria-label="Search POSKART"
      >
        <Search className="size-4 shrink-0" />
        <span className="hidden min-w-0 flex-1 truncate sm:block">
          Search POSKART...
        </span>
        <span className="ml-auto hidden shrink-0 items-center gap-1 rounded-lg border border-zinc-200/80 bg-white/70 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 md:flex">
          <span>⌘</span>K
        </span>
      </button>

      {open
        ? createPortal(
        <div
          className="fixed inset-0 z-[200] grid place-items-center p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeSearch();
          }}
        >
          <div
            role="dialog"
            aria-label="Search POSKART"
            className="z-[101] flex w-[min(42rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/15"
            style={{ height: "min(38rem, calc(100dvh - 8rem))" }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center gap-3 border-b border-zinc-100 px-4 py-3">
              <Search className="size-5 shrink-0 text-zinc-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleInputKeyDown}
                placeholder="Search pages, transactions, devices, gallery..."
                className="h-10 min-w-0 flex-1 bg-transparent text-base text-zinc-950 outline-none placeholder:text-zinc-400"
                role="combobox"
                aria-expanded="true"
                aria-controls="global-search-results"
                aria-autocomplete="list"
              />
              {dynamicSearch.isFetching ? (
                <LoaderCircle className="size-4 animate-spin text-zinc-400" />
              ) : null}
              <button
                type="button"
                onClick={closeSearch}
                className="grid size-8 shrink-0 place-items-center rounded-xl text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Close search"
              >
                <X className="size-4" />
              </button>
            </div>

            <div
              id="global-search-results"
              role="listbox"
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 [scrollbar-width:thin]"
            >
              {filteredActions.length > 0 ? (
                <SearchGroup label="Quick actions">
                  {renderItems(filteredActions)}
                </SearchGroup>
              ) : null}

              {pageResults.length > 0 ? (
                <SearchGroup label="Pages">
                  {renderItems(pageResults)}
                </SearchGroup>
              ) : null}

              {Array.from(dynamicGroups.entries()).map(([kind, items]) => (
                <SearchGroup key={kind} label={resultGroupLabels[kind]}>
                  {renderItems(items)}
                </SearchGroup>
              ))}

              {waitingForMinimumQuery ? (
                <SearchMessage>
                  Type at least 2 characters to search workspace data.
                </SearchMessage>
              ) : null}
              {dynamicSearch.isError ? (
                <SearchMessage tone="error">
                  {dynamicSearch.error instanceof Error
                    ? dynamicSearch.error.message
                    : "Unable to search this workspace."}
                </SearchMessage>
              ) : null}
              {showNoResults ? (
                <SearchMessage>
                  No pages or workspace data match “{debouncedQuery}”.
                </SearchMessage>
              ) : null}
            </div>

            <div className="hidden shrink-0 items-center gap-4 border-t border-zinc-100 px-5 py-2.5 text-[11px] text-zinc-400 sm:flex">
              <span>↑↓ Navigate</span>
              <span>↵ Open</span>
              <span>esc Close</span>
              <span className="ml-auto">
                Data search starts after 2 characters
              </span>
            </div>
          </div>
        </div>,
            document.body,
          )
        : null}
    </>
  );
}

function SearchGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-2 last:mb-0">
      <h2 className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
        {label}
      </h2>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function SearchMessage({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "error";
}) {
  return (
    <div
      className={cn(
        "m-2 rounded-2xl border border-dashed px-4 py-8 text-center text-sm",
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-zinc-200 text-zinc-500",
      )}
    >
      {children}
    </div>
  );
}
