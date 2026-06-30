import { sanitizeLayoutSchema } from "@/lib/builder/schema";
import type { ChartPoint, KpiMetric } from "@/types/analytics";
import type { Device } from "@/types/device";
import {
  PRINTER_TUNING_LIMITS,
  clampPrinterTuningValue,
} from "@/lib/printer-tuning";
import type { LayoutSchema } from "@/types/builder";
import type {
  PricingProduct,
  SubscriptionPlan,
  SubscriptionPlanInput,
} from "@/types/pricing";
import type { Template, TemplateFormValues } from "@/types/template";
import type { Organization } from "@/types/organization";
import type { ThemePreset, ThemeSchema } from "@/types/theme";
import type { Transaction } from "@/types/transaction";
import type { FrameLayout } from "@/types/frame-template";

export type {
  ChartPoint,
  KpiMetric,
  Device,
  LayoutSchema,
  PricingProduct,
  SubscriptionPlan,
  SubscriptionPlanInput,
  Template,
  TemplateFormValues,
  Organization,
  ThemePreset,
  ThemeSchema,
  Transaction,
  FrameLayout,
};
import { PRICING_PLAN_ORDER, pricingPlans } from "@/lib/constants/business";

export const TRANSACTION_COLUMNS =
  "id,booth,location,customer,package_name,amount,status,provider,created_at_label,created_at,print_status,print_attempts,print_last_error";

export const BOOTH_COLUMNS =
  "id,name,location,status,battery,app_version,last_sync,theme,template,pricing_profile,frame_templates,pricing_profiles,session_countdown_seconds,payment_countdown_seconds,printer_status,printer_name,printer_last_error,printer_status_updated_at,printer_bidirectional,printer_bottom_safe_zone_mm,printer_brightness,printer_contrast,printer_dot_density,voucher_requested_at,voucher_command,voucher_command_updated_at";

export type TransactionRow = Omit<
  Transaction,
  | "device"
  | "packageName"
  | "createdAt"
  | "printStatus"
  | "printAttempts"
  | "printLastError"
> & {
  booth: string; // actual DB column name in transactions table
  package_name: string;
  created_at_label: string;
  created_at: string;
  print_status: Transaction["printStatus"];
  print_attempts: number;
  print_last_error: string | null;
};

export type RawTransactionRow = {
  id: string;
  amount: number;
  status: string;
  provider: string;
  created_at: string;
};

export type TransactionPatch = {
  booth?: string;
  location?: string;
  customer?: string;
  package_name?: string;
  amount?: number;
  status?: Transaction["status"];
  provider?: Transaction["provider"];
  print_status?: Transaction["printStatus"];
};

export type RetryPrintTransactionRow = {
  id: string;
  organization_id: string;
  booth: string;
  print_attempts: number | null;
  print_count: number | null;
};

export type PosDashboardSaleRow = {
  id: string;
  package_name: string;
  print_count: number;
  amount: number;
  payment_method: "Cash" | "QRIS";
  notes: string | null;
  created_at: string;
};

export type PosRecentSale = {
  id: string;
  packageName: string;
  printCount: number;
  amount: number;
  paymentMethod: "Cash" | "QRIS";
  notes: string | null;
  createdAt: string;
};

export type PosDashboardSummary = {
  totalRevenue: number;
  todayRevenue: number;
  monthlyRevenue: number;
  totalTransactions: number;
  todayTransactions: number;
  totalPrints: number;
  averageTransaction: number;
  topPackages: Array<{
    name: string;
    transactions: number;
    revenue: number;
    prints: number;
  }>;
  paymentBreakdown: Array<{
    method: "Cash" | "QRIS";
    transactions: number;
    revenue: number;
  }>;
  dailySales: Array<{
    label: string;
    revenue: number;
    transactions: number;
  }>;
  recentSales: PosRecentSale[];
};

export type ActiveThemeStatistics = {
  themeName: string;
  totalSessions: number;
  totalPrints: number;
};

export type ThemeGallerySessionRow = {
  id: string;
};

export type ThemePrintSaleRow = {
  print_count: number;
  notes: string | null;
};

export type EventPeriodKey = "daily" | "weekly" | "monthly";

export type EventBreakdownItem = {
  label: string;
  value: number;
  revenue: number;
  sessions: number;
  prints: number;
};

export type EventChartPoint = {
  label: string;
  revenue: number;
  sessions: number;
  prints: number;
};

export type EventPeriodStatistics = {
  key: EventPeriodKey;
  label: string;
  startsAt: string;
  totalSessions: number;
  totalPrints: number;
  totalRevenue: number;
  qrisTotal: number;
  qrisPaid: number;
  qrisFailed: number;
  qrisSuccessRate: number;
  paymentMethods: EventBreakdownItem[];
  topFrames: EventBreakdownItem[];
  revenueSeries: EventChartPoint[];
};

export type EventStatisticsData = {
  generatedAt: string;
  periods: Record<EventPeriodKey, EventPeriodStatistics>;
};

export type BoothRow = Omit<
  Device,
  | "appVersion"
  | "lastSync"
  | "pricingProfile"
  | "frameTemplates"
  | "pricingProfiles"
  | "sessionCountdownSeconds"
  | "paymentCountdownSeconds"
  | "printerStatus"
  | "printerName"
  | "printerLastError"
  | "printerStatusUpdatedAt"
  | "printerBidirectional"
  | "voucherRequestedAt"
  | "voucherCommand"
  | "voucherCommandUpdatedAt"
> & {
  app_version: string;
  last_sync: string;
  pricing_profile: string;
  frame_templates: string[] | null;
  pricing_profiles: string[] | null;
  session_countdown_seconds: number | null;
  payment_countdown_seconds: number | null;
  printer_status: Device["printerStatus"];
  printer_name: string | null;
  printer_last_error: string | null;
  printer_status_updated_at: string | null;
  printer_bidirectional: boolean;
  printer_bottom_safe_zone_mm: number | null;
  printer_brightness: number | null;
  printer_contrast: number | null;
  printer_dot_density: number | null;
  voucher_requested_at: string | null;
  voucher_command: string | null;
  voucher_command_updated_at: string | null;
};

export type TemplateRow = Omit<
  Template,
  "assignedBooths" | "updatedAt" | "displayOrder" | "usageCount"
> & {
  assigned_booths: number;
  updated_at_label: string;
  display_order: number;
  usage_count: number;
  tagline: string | null;
  photo_count: number;
  accent_color: string;
  frame_image_url: string | null;
  frame_layout: Template["frameLayout"] | null;
  is_default: boolean;
};

export type PricingProductRow = Omit<
  PricingProduct,
  | "promoPrice"
  | "printLimit"
  | "qrisDownload"
  | "livePhotoEnabled"
  | "gifEnabled"
> & {
  promo_price: number | null;
  print_limit: number;
  qris_download: boolean;
  live_photo_enabled: boolean | null;
  gif_enabled: boolean;
};

export type SubscriptionPlanRow = {
  id: string;
  name: string;
  max_devices: number;
  duration_months: number;
  base_price: number;
  included_devices: number;
  additional_device_price_monthly: number;
  is_public: boolean;
  features: Record<string, unknown> | null;
};

export function countPhotoSlotsFromLayout(layout?: FrameLayout | null) {
  return (
    layout?.nodes.filter((node) => node.type === "photo-slot").length ?? 0
  );
}

export type ThemePresetRow = Omit<ThemePreset, "schema"> & {
  schema: ThemeSchema;
};

export type SubscriptionPlanMetadata = {
  name?: string | null;
  included_devices?: number | null;
};

export type SubscriptionRow = {
  plan_id?: string | null;
  status?: string | null;
  current_period_end?: string | null;
  device_limit?: number | null;
  subscription_plans?:
    | SubscriptionPlanMetadata
    | SubscriptionPlanMetadata[]
    | null;
};

export type OrganizationRow = {
  id: string;
  name: string;
  status: Organization["status"];
  renewal_date: string;
  devices?: { count: number }[] | null;
  organization_members?: { count: number }[] | null;
  subscriptions?: SubscriptionRow | SubscriptionRow[] | null;
};

export type ProfileWithOrganization = {
  id: string;
  email: string;
  role: string;
  created_at: string;
  organization_members?: Array<{
    role: string;
    organization_id: string;
    organizations?: { id: string; name: string } | null;
  }> | null;
};

export type OrganizationMemberWithProfile = {
  id: string;
  role: string;
  created_at: string;
  profile_id: string;
  profiles:
    | {
        id: string;
        email: string;
        role: string;
        created_at: string;
      }
    | {
        id: string;
        email: string;
        role: string;
        created_at: string;
      }[]
    | null;
};

export function subscriptionExpiryTime(subscription?: SubscriptionRow | null) {
  return subscription?.current_period_end
    ? new Date(subscription.current_period_end).getTime()
    : 0;
}

export function isSubscriptionActive(subscription?: SubscriptionRow | null) {
  return (
    ["active", "trialing"].includes(subscription?.status ?? "") &&
    subscriptionExpiryTime(subscription) > Date.now()
  );
}

export function subscriptionPlanMeta(subscription?: SubscriptionRow | null) {
  return Array.isArray(subscription?.subscription_plans)
    ? subscription?.subscription_plans[0]
    : subscription?.subscription_plans;
}

export function subscriptionDisplayName(subscription?: SubscriptionRow | null) {
  const planMeta = subscriptionPlanMeta(subscription);
  const planId = subscription?.plan_id || "free";

  if (isSubscriptionActive(subscription) && planId === "free") {
    return "Custom organization plan";
  }

  if (planMeta?.name) return planMeta.name;
  if (planId === "free") return "Free";

  return pricingPlans.find((plan) => plan.id === planId)?.name ?? planId;
}

export type LayoutSchemaRow = {
  id: string;
  name: string;
  status: "draft" | "published" | "archived";
  schema: LayoutSchema;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AssetItem = {
  id: string;
  name: string;
  folder: string;
  tag: string;
  version: string;
  size: string;
  url?: string | null;
  storage_path?: string | null;
};

export type AssetInput = {
  name: string;
  folder: string;
  tag: string;
  version: string;
  size: string;
  url?: string | null;
  storage_path?: string | null;
};

export type PricingProductInput = Omit<PricingProduct, "id">;



export type BoothInput = Omit<
  Device,
  | "id"
  | "printerStatus"
  | "printerName"
  | "printerLastError"
  | "printerStatusUpdatedAt"
  | "printerBidirectional"
  | "voucherRequestedAt"
  | "voucherCommand"
  | "voucherCommandUpdatedAt"
>;

export type TenantInput = Omit<Organization, "id">;

export type DashboardData = {
  kpiMetrics: KpiMetric[];
  weeklyChart: ChartPoint[];
  monthlyChart: ChartPoint[];
  transactions: Transaction[];
  devices: Device[];
  posSummary: PosDashboardSummary;
  eventStats: EventStatisticsData;
};

export function assertSupabaseResult<T>(
  data: T | null,
  error: { message: string } | null,
  label: string,
): T {
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }

  return data ?? ([] as T);
}

export const mapTransaction = (row: TransactionRow): Transaction => ({
  id: row.id,
  device: row.booth, // 'booth' is the DB column name, mapped to 'device' for the app type
  location: row.location,
  customer: row.customer,
  packageName: row.package_name,
  amount: row.amount,
  status: row.status,
  provider: row.provider,
  createdAt: row.created_at_label,
  createdAtRaw: row.created_at,
  printStatus: row.print_status ?? "pending",
  printAttempts: row.print_attempts ?? 0,
  printLastError: row.print_last_error ?? null,
});

export function normalizeAssignmentList(
  values?: string[] | null,
  fallback?: string | null,
) {
  const list = Array.isArray(values) ? values.filter(Boolean) : [];
  if (list.length > 0) return list;
  return fallback ? [fallback] : [];
}

export const DEVICE_ONLINE_GRACE_MS = 60_000;

export function parseRelativeSyncTime(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "just now") return Date.now();

  const relativeMatch = normalized.match(
    /^(\d+)\s*(sec|secs|second|seconds|min|mins|minute|minutes|hour|hours)\s+ago$/,
  );
  if (!relativeMatch) return null;

  const amount = Number(relativeMatch[1]);
  const unit = relativeMatch[2];
  const multiplier = unit.startsWith("sec")
    ? 1_000
    : unit.startsWith("min")
      ? 60_000
      : 3_600_000;

  return Date.now() - amount * multiplier;
}

export function isDeviceRecentlySeen(lastSync: string) {
  const parsed = Date.parse(lastSync);
  const syncTime = Number.isNaN(parsed)
    ? parseRelativeSyncTime(lastSync)
    : parsed;
  if (!syncTime) return false;
  return Date.now() - syncTime <= DEVICE_ONLINE_GRACE_MS;
}

export function resolveDeviceRuntimeStatus(row: BoothRow): Device["status"] {
  if (row.status === "maintenance") return "maintenance";
  if (row.status === "offline") return "offline";
  return isDeviceRecentlySeen(row.last_sync) ? "online" : "offline";
}

export function normalizeDeviceLocation(location: string) {
  const normalized = location.trim();
  if (normalized === "WAITING_VOUCHER" || normalized.startsWith("VOUCHER:")) {
    return "";
  }
  return location;
}

export const mapBooth = (row: BoothRow): Device => ({
  id: row.id,
  name: row.name,
  location: normalizeDeviceLocation(row.location),
  status: resolveDeviceRuntimeStatus(row),
  battery: row.battery,
  appVersion: row.app_version,
  lastSync: row.last_sync,
  theme: row.theme,
  template: row.template,
  pricingProfile: row.pricing_profile,
  frameTemplates: normalizeAssignmentList(row.frame_templates, row.template),
  pricingProfiles: normalizeAssignmentList(
    row.pricing_profiles,
    row.pricing_profile,
  ),
  sessionCountdownSeconds: row.session_countdown_seconds ?? null,
  paymentCountdownSeconds: row.payment_countdown_seconds ?? null,
  printerStatus: row.printer_status ?? "unknown",
  printerName: row.printer_name ?? null,
  printerLastError: row.printer_last_error ?? null,
  printerStatusUpdatedAt: row.printer_status_updated_at ?? null,
  printerBidirectional: row.printer_bidirectional ?? false,
  printerBottomSafeZoneMm: clampPrinterTuningValue(
    row.printer_bottom_safe_zone_mm,
    0,
    PRINTER_TUNING_LIMITS.bottomSafeZoneMm.min,
    PRINTER_TUNING_LIMITS.bottomSafeZoneMm.max,
  ),
  printerBrightness: clampPrinterTuningValue(
    row.printer_brightness,
    0,
    PRINTER_TUNING_LIMITS.brightness.min,
    PRINTER_TUNING_LIMITS.brightness.max,
  ),
  printerContrast: clampPrinterTuningValue(
    row.printer_contrast,
    0,
    PRINTER_TUNING_LIMITS.contrast.min,
    PRINTER_TUNING_LIMITS.contrast.max,
  ),
  printerDotDensity: clampPrinterTuningValue(
    row.printer_dot_density,
    1,
    PRINTER_TUNING_LIMITS.dotDensity.min,
    PRINTER_TUNING_LIMITS.dotDensity.max,
  ),
  voucherRequestedAt: row.voucher_requested_at ?? null,
  voucherCommand: row.voucher_command ?? null,
  voucherCommandUpdatedAt: row.voucher_command_updated_at ?? null,
});

export const mapTemplate = (row: TemplateRow): Template => ({
  id: row.id,
  name: row.name,
  category: row.category,
  status: row.status,
  assignedBooths: row.assigned_booths,
  updatedAt: row.updated_at_label,
  displayOrder: row.display_order ?? 0,
  usageCount: row.usage_count ?? 0,
  tagline: row.tagline ?? undefined,
  photoCount: row.photo_count ?? 4,
  accentColor: row.accent_color ?? "#C4121A",
  frameImageUrl: row.frame_image_url ?? undefined,
  frameLayout: row.frame_layout ?? null,
  isDefault: row.is_default ?? false,
});

export const mapPricingProduct = (row: PricingProductRow): PricingProduct => ({
  id: row.id,
  name: row.name,
  price: row.price,
  promoPrice: row.promo_price ?? undefined,
  printLimit: row.print_limit,
  qrisDownload: row.qris_download,
  livePhotoEnabled: row.live_photo_enabled ?? row.gif_enabled,
  gifEnabled: row.live_photo_enabled == null ? false : row.gif_enabled,
  active: row.active,
});

export const mapSubscriptionPlan = (row: SubscriptionPlanRow): SubscriptionPlan => ({
  id: row.id,
  name: row.name,
  maxDevices: row.max_devices,
  durationMonths: row.duration_months,
  basePrice: row.base_price,
  includedDevices: row.included_devices,
  additionalDevicePriceMonthly: row.additional_device_price_monthly,
  isPublic: row.is_public,
  features: row.features ?? {},
});
