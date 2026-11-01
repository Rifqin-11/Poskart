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

export type AdminNavSection =
  | "overview"
  | "operations"
  | "devices"
  | "design"
  | "photos"
  | "admin";

export type AdminNavItem = {
  href: string;
  labelKey: DictionaryKey;
  icon: React.ComponentType<{ className?: string }>;
  section: AdminNavSection;
  superAdminOnly?: boolean;
  organizationFeature?: OrganizationFeatureKey;
  activeHrefs?: string[];
};

export const adminNavItems: AdminNavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: Gauge, section: "overview" },
  { href: "/pos", labelKey: "nav.pos", icon: Calculator, section: "operations", organizationFeature: "posKasir" },
  { href: "/finance", labelKey: "nav.money", icon: WalletCards, section: "operations" },
  { href: "/transactions", labelKey: "nav.transactions", icon: Store, section: "operations" },
  { href: "/withdraw", labelKey: "nav.withdraw", icon: ReceiptText, section: "operations" },
  { href: "/pricing", labelKey: "nav.pricingTab", icon: CreditCard, section: "operations", activeHrefs: ["/pricing", "/events", "/vouchers"] },
  { href: "/queue", labelKey: "nav.queue", icon: ListOrdered, section: "devices" },
  { href: "/devices", labelKey: "nav.devices", icon: MonitorSmartphone, section: "devices" },
  { href: "/themes", labelKey: "nav.themes", icon: Palette, section: "design" },
  { href: "/templates", labelKey: "nav.templates", icon: LayoutTemplate, section: "design" },
  { href: "/showcase", labelKey: "nav.showcase", icon: PanelsTopLeft, section: "design", organizationFeature: "showcase" },
  { href: "/experience", labelKey: "nav.experience", icon: Sparkles, section: "design" },
  { href: "/gallery", labelKey: "nav.gallery", icon: Images, section: "photos" },
  { href: "/settings", labelKey: "nav.settings", icon: Settings, section: "admin" },
  { href: "/superadmin", labelKey: "nav.superAdmin", icon: Shield, section: "admin", superAdminOnly: true },
];
