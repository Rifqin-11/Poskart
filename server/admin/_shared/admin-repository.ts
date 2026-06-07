import { createClient } from "@/lib/supabase/client";
import type { ChartPoint, KpiMetric } from "@/types/analytics";
import type { Device } from "@/types/device";
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

type KpiMetricRow = KpiMetric & { sort_order: number };

type ChartPointRow = ChartPoint & {
  id: string;
  period: "weekly" | "monthly";
  sort_order: number;
};

type TransactionRow = Omit<
  Transaction,
  | "packageName"
  | "createdAt"
  | "printStatus"
  | "printAttempts"
  | "printLastError"
> & {
  package_name: string;
  created_at_label: string;
  created_at: string;
  print_status: Transaction["printStatus"];
  print_attempts: number;
  print_last_error: string | null;
};

type PosDashboardSaleRow = {
  id: string;
  package_name: string;
  print_count: number;
  amount: number;
  payment_method: "Cash" | "QRIS";
  notes: string | null;
  created_at: string;
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
  recentSales: Array<{
    id: string;
    packageName: string;
    printCount: number;
    amount: number;
    paymentMethod: "Cash" | "QRIS";
    notes: string | null;
    createdAt: string;
  }>;
};

type BoothRow = Omit<
  Device,
  | "appVersion"
  | "lastSync"
  | "pricingProfile"
  | "frameTemplates"
  | "pricingProfiles"
  | "sessionCountdownSeconds"
  | "paymentCountdownSeconds"
> & {
  app_version: string;
  last_sync: string;
  pricing_profile: string;
  frame_templates: string[] | null;
  pricing_profiles: string[] | null;
  session_countdown_seconds: number | null;
  payment_countdown_seconds: number | null;
};

type TemplateRow = Omit<Template, "assignedBooths" | "updatedAt"> & {
  assigned_booths: number;
  updated_at_label: string;
  tagline: string | null;
  photo_count: number;
  accent_color: string;
  frame_image_url: string | null;
  frame_layout: Template["frameLayout"] | null;
  is_default: boolean;
};

type PricingProductRow = Omit<
  PricingProduct,
  "promoPrice" | "printLimit" | "qrisDownload" | "gifEnabled"
> & {
  promo_price: number | null;
  print_limit: number;
  qris_download: boolean;
  gif_enabled: boolean;
};

type SubscriptionPlanRow = {
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

type ThemePresetRow = Omit<ThemePreset, "schema"> & {
  schema: ThemeSchema;
};

type SubscriptionPlanMetadata = {
  name?: string | null;
  included_devices?: number | null;
};

type SubscriptionRow = {
  plan_id?: string | null;
  status?: string | null;
  current_period_end?: string | null;
  device_limit?: number | null;
  subscription_plans?: SubscriptionPlanMetadata | SubscriptionPlanMetadata[] | null;
};

type OrganizationRow = {
  id: string;
  name: string;
  status: Organization["status"];
  renewal_date: string;
  devices?: { count: number }[] | null;
  organization_members?: { count: number }[] | null;
  subscriptions?: SubscriptionRow | SubscriptionRow[] | null;
};

type ProfileWithOrganization = {
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

type OrganizationMemberWithProfile = {
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

export type { SubscriptionPlanInput };

export type BoothInput = Omit<Device, "id">;

export type TenantInput = Omit<Organization, "id">;

export type DashboardData = {
  kpiMetrics: KpiMetric[];
  weeklyChart: ChartPoint[];
  monthlyChart: ChartPoint[];
  transactions: Transaction[];
  devices: Device[];
  posSummary: PosDashboardSummary;
};

function assertSupabaseResult<T>(
  data: T | null,
  error: { message: string } | null,
  label: string,
): T {
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }

  return data ?? ([] as T);
}

const mapChartPoint = ({
  label,
  revenue,
  transactions,
  downloads,
}: ChartPointRow): ChartPoint => ({
  label,
  revenue,
  transactions,
  downloads: downloads ?? undefined,
});

const mapTransaction = (row: TransactionRow): Transaction => ({
  id: row.id,
  device: row.device,
  location: row.location,
  customer: row.customer,
  packageName: row.package_name,
  amount: row.amount,
  status: row.status,
  provider: row.provider,
  createdAt: row.created_at_label,
  printStatus: row.print_status ?? "pending",
  printAttempts: row.print_attempts ?? 0,
  printLastError: row.print_last_error ?? null,
});

function normalizeAssignmentList(values?: string[] | null, fallback?: string | null) {
  const list = Array.isArray(values) ? values.filter(Boolean) : [];
  if (list.length > 0) return list;
  return fallback ? [fallback] : [];
}

const mapBooth = (row: BoothRow): Device => ({
  id: row.id,
  name: row.name,
  location: row.location,
  status: row.status,
  battery: row.battery,
  appVersion: row.app_version,
  lastSync: row.last_sync,
  theme: row.theme,
  template: row.template,
  pricingProfile: row.pricing_profile,
  frameTemplates: normalizeAssignmentList(row.frame_templates, row.template),
  pricingProfiles: normalizeAssignmentList(row.pricing_profiles, row.pricing_profile),
  sessionCountdownSeconds: row.session_countdown_seconds ?? null,
  paymentCountdownSeconds: row.payment_countdown_seconds ?? null,
});

const mapTemplate = (row: TemplateRow): Template => ({
  id: row.id,
  name: row.name,
  category: row.category,
  status: row.status,
  assignedBooths: row.assigned_booths,
  updatedAt: row.updated_at_label,
  tagline: row.tagline ?? undefined,
  photoCount: row.photo_count ?? 4,
  accentColor: row.accent_color ?? "#C4121A",
  frameImageUrl: row.frame_image_url ?? undefined,
  frameLayout: row.frame_layout ?? null,
  isDefault: row.is_default ?? false,
});

const mapPricingProduct = (row: PricingProductRow): PricingProduct => ({
  id: row.id,
  name: row.name,
  price: row.price,
  promoPrice: row.promo_price ?? undefined,
  printLimit: row.print_limit,
  qrisDownload: row.qris_download,
  gifEnabled: row.gif_enabled,
  active: row.active,
});

const mapSubscriptionPlan = (row: SubscriptionPlanRow): SubscriptionPlan => ({
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

async function getKpiMetrics(): Promise<KpiMetric[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("kpi_metrics")
    .select("label,value,delta,tone,sort_order")
    .order("sort_order", { ascending: true });

  return assertSupabaseResult(
    data as KpiMetricRow[] | null,
    error,
    "Unable to load KPI metrics",
  ).map(({ label, value, delta, tone }) => ({
    label,
    value,
    delta,
    tone,
  }));
}

async function getChartPoints(
  period: "weekly" | "monthly",
): Promise<ChartPoint[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chart_points")
    .select("id,period,label,revenue,transactions,downloads,sort_order")
    .eq("period", period)
    .order("sort_order", { ascending: true });

  return assertSupabaseResult(
    data as ChartPointRow[] | null,
    error,
    `Unable to load ${period} chart`,
  ).map(mapChartPoint);
}

const TRANSACTION_COLUMNS =
  "id,device,location,customer,package_name,amount,status,provider,created_at_label,created_at,print_status,print_attempts,print_last_error";

const BOOTH_COLUMNS =
  "id,name,location,status,battery,app_version,last_sync,theme,template,pricing_profile,frame_templates,pricing_profiles,session_countdown_seconds,payment_countdown_seconds";

async function getTransactions(): Promise<Transaction[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(TRANSACTION_COLUMNS)
    .order("created_at", { ascending: false });

  return assertSupabaseResult(
    data as TransactionRow[] | null,
    error,
    "Unable to load transactions",
  ).map(mapTransaction);
}

async function getPosDashboardSummary(): Promise<PosDashboardSummary> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pos_sales")
    .select("id,package_name,print_count,amount,payment_method,notes,created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  const sales = assertSupabaseResult(
    data as PosDashboardSaleRow[] | null,
    error,
    "Unable to load POS sales summary",
  );

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const currencyDateFormatter = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const weekdayFormatter = new Intl.DateTimeFormat("id-ID", { weekday: "short" });

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalPrints = sales.reduce((sum, sale) => sum + sale.print_count, 0);
  const todaySales = sales.filter((sale) => new Date(sale.created_at) >= startOfToday);
  const monthlySales = sales.filter((sale) => new Date(sale.created_at) >= startOfMonth);

  const packageTotals = new Map<string, { transactions: number; revenue: number; prints: number }>();
  const paymentTotals = new Map<"Cash" | "QRIS", { transactions: number; revenue: number }>();

  for (const sale of sales) {
    const packageTotal = packageTotals.get(sale.package_name) ?? {
      transactions: 0,
      revenue: 0,
      prints: 0,
    };
    packageTotal.transactions += 1;
    packageTotal.revenue += sale.amount;
    packageTotal.prints += sale.print_count;
    packageTotals.set(sale.package_name, packageTotal);

    const paymentTotal = paymentTotals.get(sale.payment_method) ?? {
      transactions: 0,
      revenue: 0,
    };
    paymentTotal.transactions += 1;
    paymentTotal.revenue += sale.amount;
    paymentTotals.set(sale.payment_method, paymentTotal);
  }

  const dailySales = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
    const daySales = sales.filter((sale) => {
      const createdAt = new Date(sale.created_at);
      return createdAt >= dayStart && createdAt < dayEnd;
    });

    return {
      label: weekdayFormatter.format(dayStart),
      revenue: daySales.reduce((sum, sale) => sum + sale.amount, 0),
      transactions: daySales.length,
    };
  });

  return {
    totalRevenue,
    todayRevenue: todaySales.reduce((sum, sale) => sum + sale.amount, 0),
    monthlyRevenue: monthlySales.reduce((sum, sale) => sum + sale.amount, 0),
    totalTransactions: sales.length,
    todayTransactions: todaySales.length,
    totalPrints,
    averageTransaction: sales.length > 0 ? Math.round(totalRevenue / sales.length) : 0,
    topPackages: Array.from(packageTotals.entries())
      .map(([name, total]) => ({ name, ...total }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
    paymentBreakdown: Array.from(paymentTotals.entries()).map(([method, total]) => ({
      method,
      ...total,
    })),
    dailySales,
    recentSales: sales.slice(0, 5).map((sale) => ({
      id: sale.id,
      packageName: sale.package_name,
      printCount: sale.print_count,
      amount: sale.amount,
      paymentMethod: sale.payment_method,
      notes: sale.notes,
      createdAt: currencyDateFormatter.format(new Date(sale.created_at)),
    })),
  };
}

async function getFailedPrintsByBooth(
  boothName: string,
): Promise<Transaction[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(TRANSACTION_COLUMNS)
    .eq("device", boothName)
    .in("print_status", ["failed", "pending"])
    .order("created_at", { ascending: false })
    .limit(50);

  return assertSupabaseResult(
    data as TransactionRow[] | null,
    error,
    "Unable to load failed prints",
  ).map(mapTransaction);
}

async function retryPrint(transactionId: string): Promise<void> {
  const supabase = createClient();
  // Mark the row as reprinting + bump attempt counter. The Flutter kiosk is
  // expected to poll for `reprinting` rows and flip them to `printed` or
  // `failed` after attempting the physical reprint.
  const { data: current, error: readError } = await supabase
    .from("transactions")
    .select("print_attempts")
    .eq("id", transactionId)
    .maybeSingle();
  if (readError) {
    throw new Error(`Unable to load transaction: ${readError.message}`);
  }
  const attempts =
    ((current as { print_attempts?: number } | null)?.print_attempts ?? 0) + 1;

  const { error } = await supabase
    .from("transactions")
    .update({
      print_status: "reprinting",
      print_attempts: attempts,
      print_last_attempt_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", transactionId);
  if (error) throw new Error(`Unable to queue reprint: ${error.message}`);
}

async function getBooths(): Promise<Device[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("devices")
    .select(BOOTH_COLUMNS)
    .order("name", { ascending: true });

  return assertSupabaseResult(
    data as BoothRow[] | null,
    error,
    "Unable to load devices",
  ).map(mapBooth);
}

async function getTemplates(): Promise<Template[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("templates")
    .select(
      "id,name,category,status,assigned_booths,updated_at_label,tagline,photo_count,accent_color,frame_image_url,frame_layout,is_default",
    )
    .order("updated_at", { ascending: false });

  return assertSupabaseResult(
    data as TemplateRow[] | null,
    error,
    "Unable to load templates",
  ).map(mapTemplate);
}

async function createTemplate(values: TemplateFormValues): Promise<void> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const id = `TPL-${Date.now()}`;
  const { error } = await supabase.from("templates").insert({
    id,
    name: values.name,
    category: values.category,
    status: values.status,
    assigned_booths: 0,
    updated_at_label: "just now",
    tagline: values.tagline || null,
    photo_count: values.photoCount,
    accent_color: values.accentColor,
    frame_image_url: values.frameImageUrl || null,
    frame_layout: values.frameLayout ?? null,
    is_default: values.isDefault,
    updated_at: now,
  });

  if (error) throw new Error(`Unable to create template: ${error.message}`);
}

async function updateTemplate(
  id: string,
  values: Partial<TemplateFormValues>,
): Promise<void> {
  const supabase = createClient();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_at_label: "just now",
  };

  if (values.name !== undefined) patch.name = values.name;
  if (values.category !== undefined) patch.category = values.category;
  if (values.status !== undefined) patch.status = values.status;
  if (values.tagline !== undefined) patch.tagline = values.tagline || null;
  if (values.photoCount !== undefined) patch.photo_count = values.photoCount;
  if (values.accentColor !== undefined) patch.accent_color = values.accentColor;
  if (values.frameImageUrl !== undefined)
    patch.frame_image_url = values.frameImageUrl || null;
  if (values.frameLayout !== undefined)
    patch.frame_layout = values.frameLayout ?? null;
  if (values.isDefault !== undefined) patch.is_default = values.isDefault;

  const { error } = await supabase.from("templates").update(patch).eq("id", id);
  if (error) throw new Error(`Unable to update template: ${error.message}`);
}

async function deleteTemplate(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("templates").delete().eq("id", id);
  if (error) throw new Error(`Unable to delete template: ${error.message}`);
}

async function getPricingProducts(): Promise<PricingProduct[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pricing_products")
    .select(
      "id,name,price,promo_price,print_limit,qris_download,gif_enabled,active",
    )
    .order("price", { ascending: true });

  return assertSupabaseResult(
    data as PricingProductRow[] | null,
    error,
    "Unable to load pricing products",
  ).map(mapPricingProduct);
}

async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("subscription_plans")
    .select(
      "id,name,max_devices,duration_months,base_price,included_devices,additional_device_price_monthly,is_public,features",
    )
    .in("id", ["monthly", "quarterly", "semiannual", "yearly"])
    .order("duration_months", { ascending: true });

  return assertSupabaseResult(
    data as SubscriptionPlanRow[] | null,
    error,
    "Unable to load subscription plans",
  ).map(mapSubscriptionPlan);
}

async function updateSubscriptionPlan(
  id: string,
  values: SubscriptionPlanInput,
): Promise<void> {
  const supabase = createClient();
  const includedDevices = Math.max(1, Math.floor(values.includedDevices || 1));
  const durationMonths = Math.max(1, Math.floor(values.durationMonths || 1));
  const additionalDevicePriceMonthly = Math.max(
    0,
    Math.floor(values.additionalDevicePriceMonthly || 0),
  );
  const { error } = await supabase
    .from("subscription_plans")
    .update({
      name: values.name.trim(),
      max_devices: includedDevices,
      duration_months: durationMonths,
      base_price: Math.max(0, Math.floor(values.basePrice || 0)),
      included_devices: includedDevices,
      additional_device_price_monthly: additionalDevicePriceMonthly,
      is_public: values.isPublic,
      features: {
        included: `${includedDevices} device${includedDevices > 1 ? "s" : ""}`,
        addon: `Rp ${Math.round(additionalDevicePriceMonthly / 1000)}K/device/month`,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(`Unable to update subscription plan: ${error.message}`);
}

async function getTenants(): Promise<Organization[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select(`
      id,
      name,
      status,
      renewal_date,
      devices:devices(count),
      organization_members:organization_members(count),
      subscriptions (
        plan_id,
        status,
        device_limit,
        current_period_end,
        subscription_plans (
          name,
          duration_months,
          base_price,
          included_devices,
          additional_device_price_monthly
        )
      )
    `)
    .order("name", { ascending: true });

  if (error) throw new Error(`Unable to load organizations: ${error.message}`);

  return ((data ?? []) as OrganizationRow[]).map((row) => {
    const sub = Array.isArray(row.subscriptions) ? row.subscriptions[0] : row.subscriptions;
    const planMeta = Array.isArray(sub?.subscription_plans)
      ? sub?.subscription_plans[0]
      : sub?.subscription_plans;
    const planId = sub?.plan_id || 'free';
    const subStatus = sub?.status || 'free';
    const expiresAt = sub?.current_period_end || null;
    const deviceLimit = sub?.device_limit ?? planMeta?.included_devices ?? 1;
    const planName =
      planMeta?.name ??
      (planId === "free"
        ? "Free"
        : planId === "monthly"
          ? "1 Month"
          : planId === "quarterly"
            ? "3 Months"
            : planId === "semiannual"
              ? "6 Months"
              : planId === "yearly"
                ? "1 Year"
                : planId);

    // Get count value from counts response structure
    const devicesCount = row.devices?.[0]?.count ?? 0;
    const usersCount = row.organization_members?.[0]?.count ?? 0;

    return {
      id: row.id,
      name: row.name,
      status: row.status,
      devices: devicesCount,
      users: usersCount,
      renewalDate: row.renewal_date,
      planId: planId,
      subscriptionStatus: subStatus,
      subscriptionExpiresAt: expiresAt,
      deviceLimit,
      plan: planName,
    };
  });
}

async function getThemes(): Promise<ThemePreset[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("theme_presets")
    .select("id,name,status,schema")
    .order("name", { ascending: true });

  return assertSupabaseResult(
    data as ThemePresetRow[] | null,
    error,
    "Unable to load theme presets",
  );
}

async function getAssets(): Promise<AssetItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("assets")
    .select("id,name,folder,tag,version,size,url,storage_path")
    .order("folder", { ascending: true });

  return assertSupabaseResult(
    data as AssetItem[] | null,
    error,
    "Unable to load assets",
  );
}

async function createAsset(values: AssetInput): Promise<void> {
  const supabase = createClient();
  const id = `AST-${crypto.randomUUID()}`;
  const { error } = await supabase.from("assets").insert({
    id,
    name: values.name,
    folder: values.folder,
    tag: values.tag,
    version: values.version || "v1",
    size: values.size,
    url: values.url ?? null,
    storage_path: values.storage_path ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Unable to create asset: ${error.message}`);
}

async function updateAsset(
  id: string,
  patch: Partial<AssetInput>,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("assets")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Unable to update asset: ${error.message}`);
}

async function deleteAsset(
  id: string,
  storagePath?: string | null,
): Promise<void> {
  const supabase = createClient();
  if (storagePath) {
    // best-effort — storage delete failure shouldn't block row deletion
    await supabase.storage.from("builder-assets").remove([storagePath]);
  }
  const { error } = await supabase.from("assets").delete().eq("id", id);
  if (error) throw new Error(`Unable to delete asset: ${error.message}`);
}

async function createPricingProduct(
  values: PricingProductInput,
): Promise<void> {
  const supabase = createClient();
  const id = `PRC-${Date.now()}`;
  const { error } = await supabase.from("pricing_products").insert({
    id,
    name: values.name,
    price: values.price,
    promo_price: values.promoPrice ?? null,
    print_limit: values.printLimit,
    qris_download: values.qrisDownload,
    gif_enabled: values.gifEnabled,
    active: values.active,
    updated_at: new Date().toISOString(),
  });
  if (error)
    throw new Error(`Unable to create pricing product: ${error.message}`);
}

async function updatePricingProduct(
  id: string,
  patch: Partial<PricingProductInput>,
): Promise<void> {
  const supabase = createClient();
  const dbPatch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.price !== undefined) dbPatch.price = patch.price;
  if (patch.promoPrice !== undefined)
    dbPatch.promo_price = patch.promoPrice ?? null;
  if (patch.printLimit !== undefined) dbPatch.print_limit = patch.printLimit;
  if (patch.qrisDownload !== undefined)
    dbPatch.qris_download = patch.qrisDownload;
  if (patch.gifEnabled !== undefined) dbPatch.gif_enabled = patch.gifEnabled;
  if (patch.active !== undefined) dbPatch.active = patch.active;

  const { error } = await supabase
    .from("pricing_products")
    .update(dbPatch)
    .eq("id", id);
  if (error)
    throw new Error(`Unable to update pricing product: ${error.message}`);
}

async function deletePricingProduct(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("pricing_products")
    .delete()
    .eq("id", id);
  if (error)
    throw new Error(`Unable to delete pricing product: ${error.message}`);
}

async function createBooth(values: BoothInput): Promise<void> {
  const supabase = createClient();
  const id = `BTH-${Date.now()}`;
  const frameTemplates = normalizeAssignmentList(values.frameTemplates, values.template);
  const pricingProfiles = normalizeAssignmentList(values.pricingProfiles, values.pricingProfile);
  const { error } = await supabase.from("devices").insert({
    id,
    name: values.name,
    location: values.location,
    status: values.status,
    battery: values.battery,
    app_version: values.appVersion,
    last_sync: values.lastSync,
    theme: values.theme,
    template: frameTemplates[0] ?? "",
    pricing_profile: pricingProfiles[0] ?? "",
    frame_templates: frameTemplates,
    pricing_profiles: pricingProfiles,
    session_countdown_seconds: values.sessionCountdownSeconds ?? null,
    payment_countdown_seconds: values.paymentCountdownSeconds ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Unable to create device: ${error.message}`);
}

async function updateBooth(
  id: string,
  patch: Partial<BoothInput>,
): Promise<void> {
  const supabase = createClient();
  const dbPatch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.location !== undefined) dbPatch.location = patch.location;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.battery !== undefined) dbPatch.battery = patch.battery;
  if (patch.appVersion !== undefined) dbPatch.app_version = patch.appVersion;
  if (patch.lastSync !== undefined) dbPatch.last_sync = patch.lastSync;
  if (patch.theme !== undefined) dbPatch.theme = patch.theme;
  if (patch.template !== undefined) dbPatch.template = patch.template;
  if (patch.frameTemplates !== undefined) {
    const frameTemplates = normalizeAssignmentList(patch.frameTemplates, patch.template);
    dbPatch.frame_templates = frameTemplates;
    dbPatch.template = frameTemplates[0] ?? "";
  }
  if (patch.pricingProfile !== undefined)
    dbPatch.pricing_profile = patch.pricingProfile;
  if (patch.pricingProfiles !== undefined) {
    const pricingProfiles = normalizeAssignmentList(patch.pricingProfiles, patch.pricingProfile);
    dbPatch.pricing_profiles = pricingProfiles;
    dbPatch.pricing_profile = pricingProfiles[0] ?? "";
  }
  if (patch.sessionCountdownSeconds !== undefined)
    dbPatch.session_countdown_seconds = patch.sessionCountdownSeconds ?? null;
  if (patch.paymentCountdownSeconds !== undefined)
    dbPatch.payment_countdown_seconds = patch.paymentCountdownSeconds ?? null;

  const { error } = await supabase.from("devices").update(dbPatch).eq("id", id);
  if (error) throw new Error(`Unable to update device: ${error.message}`);
}

async function deleteBooth(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("devices").delete().eq("id", id);
  if (error) throw new Error(`Unable to delete device: ${error.message}`);
}

async function createTenant(values: TenantInput): Promise<void> {
  const supabase = createClient();
  const orgId = `org_${Date.now()}`;
  
  const { error: orgErr } = await supabase.from("organizations").insert({
    id: orgId,
    name: values.name,
    status: values.status,
    renewal_date: values.renewalDate,
    updated_at: new Date().toISOString(),
  });
  if (orgErr) throw new Error(`Unable to create organization: ${orgErr.message}`);

  const { error: subErr } = await supabase.from("subscriptions").insert({
    organization_id: orgId,
    plan_id: values.planId || 'free',
    status: values.subscriptionStatus || 'free',
    current_period_end: values.subscriptionExpiresAt || null,
    device_limit: values.deviceLimit ?? 1,
  });
  if (subErr) throw new Error(`Unable to create subscription: ${subErr.message}`);
}

async function updateTenant(
  id: string,
  patch: Partial<TenantInput>,
): Promise<void> {
  const supabase = createClient();
  const dbPatch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.renewalDate !== undefined) dbPatch.renewal_date = patch.renewalDate;
  
  if (Object.keys(dbPatch).length > 1) {
    const { error } = await supabase.from("organizations").update(dbPatch).eq("id", id);
    if (error) throw new Error(`Unable to update organization: ${error.message}`);
  }

  // Update subscription separately
  if (patch.planId !== undefined || patch.subscriptionStatus !== undefined || patch.subscriptionExpiresAt !== undefined || patch.deviceLimit !== undefined) {
    const subPatch: Record<string, unknown> = {};
    if (patch.planId !== undefined) subPatch.plan_id = patch.planId;
    if (patch.subscriptionStatus !== undefined) subPatch.status = patch.subscriptionStatus;
    if (patch.subscriptionExpiresAt !== undefined) subPatch.current_period_end = patch.subscriptionExpiresAt;
    if (patch.deviceLimit !== undefined) subPatch.device_limit = Math.max(1, patch.deviceLimit);
    
    if (Object.keys(subPatch).length > 0) {
      const { error } = await supabase.from("subscriptions").update(subPatch).eq("organization_id", id);
      if (error) {
        await supabase.from("subscriptions").upsert({
          organization_id: id,
          plan_id: patch.planId || 'free',
          status: patch.subscriptionStatus || 'free',
          current_period_end: patch.subscriptionExpiresAt || null,
          device_limit: patch.deviceLimit ?? 1,
        });
      }
    }
  }
}

async function deleteTenant(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("organizations").delete().eq("id", id);
  if (error) throw new Error(`Unable to delete organization: ${error.message}`);
}

async function getLayoutSchemas(): Promise<LayoutSchemaRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("layout_schemas")
    .select("id,name,status,schema,is_active,created_at,updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Unable to load layout schemas: ${error.message}`);
  return (data ?? []) as LayoutSchemaRow[];
}

async function saveLayoutAsTheme(
  name: string,
  schema: LayoutSchema,
  existingId?: string,
): Promise<string> {
  const supabase = createClient();
  const id = existingId ?? `LYT-${Date.now()}`;
  const { error } = await supabase.from("layout_schemas").upsert({
    id,
    name,
    status: "draft",
    schema,
    is_active: false,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Unable to save layout: ${error.message}`);
  return id;
}

async function setActiveLayout(id: string): Promise<void> {
  const supabase = createClient();
  // Deactivate all
  const { error: e1 } = await supabase
    .from("layout_schemas")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .neq("id", id);
  if (e1) throw new Error(`Unable to deactivate layouts: ${e1.message}`);
  // Activate the chosen one
  const { error: e2 } = await supabase
    .from("layout_schemas")
    .update({
      is_active: true,
      status: "published",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (e2) throw new Error(`Unable to activate layout: ${e2.message}`);
}

async function deactivateLayout(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("layout_schemas")
    .update({
      is_active: false,
      status: "draft",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(`Unable to deactivate layout: ${error.message}`);
}

async function deleteLayout(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("layout_schemas").delete().eq("id", id);
  if (error) throw new Error(`Unable to delete layout: ${error.message}`);
}

async function getLayoutSchema(): Promise<LayoutSchemaRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("layout_schemas")
    .select("id,name,status,schema,is_active,created_at,updated_at")
    .eq("id", "default-photobooth")
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load layout schema: ${error.message}`);
  }

  return (data as LayoutSchemaRow | null) ?? null;
}

async function publishLayoutSchema(schema: LayoutSchema): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("layout_schemas").upsert({
    id: "default-photobooth",
    name: "Default Photobooth Layout",
    status: "published",
    schema,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Unable to publish layout schema: ${error.message}`);
  }
}

async function publishThemeSchema(schema: ThemeSchema): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("theme_presets").upsert({
    id: "THM-ACTIVE",
    name: "Active POSKART Theme",
    status: "published",
    schema,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Unable to publish theme schema: ${error.message}`);
  }
}

async function getDashboard(): Promise<DashboardData> {
  const [kpiMetrics, weeklyChart, monthlyChart, transactions, devices, posSummary] =
    await Promise.all([
      getKpiMetrics(),
      getChartPoints("weekly"),
      getChartPoints("monthly"),
      getTransactions(),
      getBooths(),
      getPosDashboardSummary(),
    ]);

  return { kpiMetrics, weeklyChart, monthlyChart, transactions, devices, posSummary };
}

async function getSubscriptionStatus(): Promise<{ tier: "Free" | "Pro"; expiry: string | null; planId: string | null; planName: string; deviceLimit: number }> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) {
    return { tier: "Free", expiry: null, planId: null, planName: "Free", deviceLimit: 1 };
  }

  const { data: profile } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", userData.user.id)
    .limit(1)
    .single();

  if (!profile?.organization_id) {
    return { tier: "Free", expiry: null, planId: null, planName: "Free", deviceLimit: 1 };
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select(`
      plan_id,
      status,
      device_limit,
      current_period_end,
      subscription_plans (
        name,
        included_devices
      )
    `)
    .eq("organization_id", profile.organization_id)
    .maybeSingle();

  const planName = sub?.subscription_plans?.name ?? "Free";
  const deviceLimit = sub?.device_limit ?? sub?.subscription_plans?.included_devices ?? 1;

  if (sub && sub.plan_id !== "free" && sub.current_period_end) {
    const expiryTime = new Date(sub.current_period_end).getTime();
    if (expiryTime > Date.now()) {
      return {
        tier: "Pro",
        expiry: new Date(expiryTime).toLocaleDateString("id-ID", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        planId: sub.plan_id,
        planName,
        deviceLimit,
      };
    }
  }

  return { tier: "Free", expiry: null, planId: sub?.plan_id ?? null, planName, deviceLimit };
}

async function getSubscriptionOrders() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("subscription_orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

async function updateSubscriptionOrderStatus({
  id,
  status,
}: {
  id: string;
  status: "pending" | "paid" | "failed" | "cancelled";
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("subscription_orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getProfiles() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      email,
      role,
      created_at,
      organization_members (
        role,
        organization_id,
        organizations (
          id,
          name
        )
      )
    `)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as ProfileWithOrganization[]).map((profile) => {
    const memberInfo = profile.organization_members?.[0];
    return {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      created_at: profile.created_at,
      organizationId: memberInfo?.organization_id || null,
      organizationName: memberInfo?.organizations?.name || null,
      memberRole: memberInfo?.role || null,
    };
  });
}

async function updateProfile({
  id,
  patch,
  organizationId,
}: {
  id: string;
  patch: Record<string, unknown>;
  organizationId?: string | null;
}) {
  const supabase = createClient();
  
  const { data: profile, error } = await supabase
    .from("profiles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  if (organizationId !== undefined) {
    if (organizationId) {
      const { data: existing } = await supabase
        .from("organization_members")
        .select("id")
        .eq("profile_id", id)
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error: mErr } = await supabase
          .from("organization_members")
          .update({ organization_id: organizationId, updated_at: new Date().toISOString() })
          .eq("profile_id", id);
        if (mErr) throw mErr;
      } else {
        const { error: mErr } = await supabase
          .from("organization_members")
          .insert({
            organization_id: organizationId,
            profile_id: id,
            role: "staff",
          });
        if (mErr) throw mErr;
      }
    } else {
      const { error: mErr } = await supabase
        .from("organization_members")
        .delete()
        .eq("profile_id", id);
      if (mErr) throw mErr;
    }
  }

  return profile;
}

async function deleteProfile(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", id);
  if (error) throw error;
  return true;
}

export const adminRepository = {
  dashboard: getDashboard,
  transactions: getTransactions,
  failedPrintsByBooth: getFailedPrintsByBooth,
  retryPrint,
  devices: getBooths,
  templates: getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  pricing: getPricingProducts,
  createPricingProduct,
  updatePricingProduct,
  deletePricingProduct,
  subscriptionPlans: getSubscriptionPlans,
  updateSubscriptionPlan,
  createBooth,
  updateBooth,
  deleteBooth,
  organizations: getTenants,
  createTenant,
  updateTenant,
  deleteTenant,
  themes: getThemes,
  assets: getAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  layoutSchema: getLayoutSchema,
  layoutSchemas: getLayoutSchemas,
  publishLayoutSchema,
  publishThemeSchema,
  saveLayoutAsTheme,
  setActiveLayout,
  deactivateLayout,
  deleteLayout,
  getSubscriptionStatus,
  getSubscriptionOrders,
  updateSubscriptionOrderStatus,
  getProfiles,
  updateProfile,
  deleteProfile,
  getMyTenantDetails,
  updateMyTenantName,
  getMyTenantMembers,
  getMyTenantInvitations,
  inviteUserToTenant,
  deleteTenantInvitation,
  removeMemberFromTenant,
};

async function getMyTenantDetails() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile, error: pErr } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .limit(1)
    .single();
  if (pErr || !profile?.organization_id) throw new Error("No organization associated");

  const { data: organization, error: tErr } = await supabase
    .from("organizations")
    .select(`
      *,
      subscriptions (
        plan_id,
        status,
        current_period_end,
        device_limit,
        subscription_plans (
          name,
          duration_months,
          base_price,
          included_devices,
          additional_device_price_monthly
        )
      )
    `)
    .eq("id", profile.organization_id)
    .single();
  if (tErr) throw tErr;
  const sub = Array.isArray(organization.subscriptions)
    ? organization.subscriptions[0]
    : organization.subscriptions;
  const subscriptionExpiryTime = sub?.current_period_end
    ? new Date(sub.current_period_end).getTime()
    : 0;
  const subscriptionIsActive =
    sub?.plan_id &&
    sub.plan_id !== "free" &&
    ["active", "trialing"].includes(sub.status ?? "") &&
    subscriptionExpiryTime > Date.now();

  return {
    ...organization,
    plan_id: sub?.plan_id ?? "free",
    plan_name: sub?.subscription_plans?.name ?? "Free",
    join_code: organization.join_code ?? null,
    subscription_status: sub?.status ?? "free",
    subscription_expires_at: sub?.current_period_end ?? null,
    device_limit: sub?.device_limit ?? sub?.subscription_plans?.included_devices ?? 1,
    subscription_is_active: subscriptionIsActive,
  };
}

async function updateMyTenantName(name: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .limit(1)
    .single();
  if (!profile?.organization_id) throw new Error("No organization associated");

  const { data, error } = await supabase
    .from("organizations")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", profile.organization_id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getMyTenantMembers() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .limit(1)
    .single();
  if (!profile?.organization_id) throw new Error("No organization associated");

  const { data, error } = await supabase
    .from("organization_members")
    .select("id, role, created_at, profile_id, profiles(id, email, role, created_at)")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return ((data ?? []) as OrganizationMemberWithProfile[]).map((member) => {
    const memberProfile = Array.isArray(member.profiles)
      ? member.profiles[0]
      : member.profiles;

    return {
      id: member.id,
      email: memberProfile?.email ?? "Unknown user",
      role: member.role,
      created_at: member.created_at,
      profile_id: member.profile_id,
    };
  });
}

async function getMyTenantInvitations() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .limit(1)
    .single();
  if (!profile?.organization_id) throw new Error("No organization associated");

  const { data, error } = await supabase
    .from("organization_invitations")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

async function inviteUserToTenant(email: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .limit(1)
    .single();
  if (!profile?.organization_id) throw new Error("No organization associated");

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    const { data: existingMember } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", profile.organization_id)
      .eq("profile_id", existingProfile.id)
      .maybeSingle();

    if (existingMember) {
      throw new Error("User is already a member of this organization");
    }

    const { error: memberErr } = await supabase
      .from("organization_members")
      .insert({
        organization_id: profile.organization_id,
        profile_id: existingProfile.id,
        role: "staff",
      });
    if (memberErr) throw memberErr;
    return { status: "joined" };
  }

  const { data: existingInvitation } = await supabase
    .from("organization_invitations")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .eq("email", email)
    .maybeSingle();

  if (existingInvitation) {
    throw new Error("Invitation already exists for this email");
  }

  const { data, error } = await supabase
    .from("organization_invitations")
    .insert({
      email: email,
      organization_id: profile.organization_id,
      invited_by: user.email ?? "Admin",
    })
    .select()
    .single();
  if (error) throw error;
  return { status: "invited", data };
}

async function deleteTenantInvitation(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("organization_invitations")
    .delete()
    .eq("id", id);
  if (error) throw error;
  return true;
}

async function removeMemberFromTenant(memberId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: currentMembership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .limit(1)
    .single();
  if (!currentMembership?.organization_id) {
    throw new Error("No organization associated");
  }

  const { data: member, error: memberErr } = await supabase
    .from("organization_members")
    .select("id, profile_id, organization_id")
    .eq("id", memberId)
    .eq("organization_id", currentMembership.organization_id)
    .maybeSingle();
  if (memberErr) throw memberErr;
  if (!member) throw new Error("Member not found");

  if (member.profile_id === user.id) {
    throw new Error("You cannot remove yourself from your own organization");
  }

  const { error: deleteErr } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", member.id);
  if (deleteErr) throw deleteErr;
  return true;
}
