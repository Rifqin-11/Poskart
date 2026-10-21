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
  Sparkles,
  Store,
  WalletCards,
} from "lucide-react";
import type { DictionaryKey } from "@/lib/i18n/dictionaries";
import type { OrganizationFeatureKey } from "@/lib/organization-features";

export type AdminNavItem = {
  href: string;
  labelKey: DictionaryKey;
  icon: React.ComponentType<{ className?: string }>;
  superAdminOnly?: boolean;
  organizationFeature?: OrganizationFeatureKey;
  activeHrefs?: string[];
};

export const adminNavItems: AdminNavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: Gauge },
  { href: "/queue", labelKey: "nav.queue", icon: ListOrdered },
  { href: "/finance", labelKey: "nav.money", icon: WalletCards },
  { href: "/pos", labelKey: "nav.pos", icon: Calculator, organizationFeature: "posKasir" },
  { href: "/transactions", labelKey: "nav.transactions", icon: Store },
  { href: "/withdraw", labelKey: "nav.withdraw", icon: ReceiptText },
  { href: "/pricing", labelKey: "nav.pricingPromotions", icon: CreditCard, activeHrefs: ["/pricing", "/vouchers"] },
  { href: "/devices", labelKey: "nav.devices", icon: MonitorSmartphone },
  { href: "/themes", labelKey: "nav.themes", icon: Palette },
  { href: "/templates", labelKey: "nav.templates", icon: LayoutTemplate },
  { href: "/showcase", labelKey: "nav.showcase", icon: PanelsTopLeft, organizationFeature: "showcase" },
  { href: "/experience", labelKey: "nav.experience", icon: Sparkles },
  { href: "/gallery", labelKey: "nav.gallery", icon: Images },
  { href: "/superadmin", labelKey: "nav.superAdmin", icon: Shield, superAdminOnly: true },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];
