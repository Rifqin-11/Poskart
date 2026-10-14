import {
  Calculator,
  CreditCard,
  Gauge,
  Images,
  LayoutTemplate,
  ListOrdered,
  MonitorSmartphone,
  Palette,
  PanelsTopLeft,
  ReceiptText,
  Settings,
  Shield,
  Store,
  WalletCards,
} from "lucide-react";
import type { DictionaryKey } from "@/lib/i18n/dictionaries";
import type { OrganizationFeatureKey } from "@/lib/organization-features";

export type AdminNavItem = {
  href: string;
  labelKey: DictionaryKey;
  icon: React.ComponentType<{ className?: string }>;
  requiresSubscription?: boolean;
  superAdminOnly?: boolean;
  organizationFeature?: OrganizationFeatureKey;
  activeHrefs?: string[];
};

export const adminNavItems: AdminNavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: Gauge },
  { href: "/queue", labelKey: "nav.queue", icon: ListOrdered, requiresSubscription: true },
  { href: "/finance", labelKey: "nav.money", icon: WalletCards, requiresSubscription: true },
  { href: "/pos", labelKey: "nav.pos", icon: Calculator, requiresSubscription: true, organizationFeature: "posKasir" },
  { href: "/transactions", labelKey: "nav.transactions", icon: Store, requiresSubscription: true },
  { href: "/withdraw", labelKey: "nav.withdraw", icon: ReceiptText, requiresSubscription: true },
  { href: "/pricing", labelKey: "nav.pricingPromotions", icon: CreditCard, requiresSubscription: true, activeHrefs: ["/pricing", "/vouchers"] },
  { href: "/devices", labelKey: "nav.devices", icon: MonitorSmartphone, requiresSubscription: true },
  { href: "/themes", labelKey: "nav.themes", icon: Palette, requiresSubscription: true },
  { href: "/templates", labelKey: "nav.templates", icon: LayoutTemplate, requiresSubscription: true },
  { href: "/showcase", labelKey: "nav.showcase", icon: PanelsTopLeft, requiresSubscription: true, organizationFeature: "showcase" },
  { href: "/gallery", labelKey: "nav.gallery", icon: Images, requiresSubscription: true },
  { href: "/superadmin", labelKey: "nav.superAdmin", icon: Shield, superAdminOnly: true },
  { href: "/settings", labelKey: "nav.settings", icon: Settings, requiresSubscription: true },
];
