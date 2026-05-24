import { createClient } from "@/lib/supabase/client";
import type { ChartPoint, KpiMetric } from "@/types/analytics";
import type { Booth } from "@/types/booth";
import type { LayoutSchema } from "@/types/builder";
import type { PricingProduct } from "@/types/pricing";
import type { Template } from "@/types/template";
import type { Tenant } from "@/types/tenant";
import type { ThemePreset, ThemeSchema } from "@/types/theme";
import type { Transaction } from "@/types/transaction";

type KpiMetricRow = KpiMetric & { sort_order: number };

type ChartPointRow = ChartPoint & {
  id: string;
  period: "weekly" | "monthly";
  sort_order: number;
};

type TransactionRow = Omit<Transaction, "packageName" | "createdAt"> & {
  package_name: string;
  created_at_label: string;
  created_at: string;
};

type BoothRow = Omit<Booth, "appVersion" | "lastSync" | "pricingProfile"> & {
  app_version: string;
  last_sync: string;
  pricing_profile: string;
};

type TemplateRow = Omit<Template, "assignedBooths" | "updatedAt"> & {
  assigned_booths: number;
  updated_at_label: string;
};

type PricingProductRow = Omit<PricingProduct, "promoPrice" | "printLimit" | "qrisDownload" | "gifEnabled"> & {
  promo_price: number | null;
  print_limit: number;
  qris_download: boolean;
  gif_enabled: boolean;
};

type TenantRow = Omit<Tenant, "renewalDate"> & {
  renewal_date: string;
};

type ThemePresetRow = Omit<ThemePreset, "schema"> & {
  schema: ThemeSchema;
};

type LayoutSchemaRow = {
  id: string;
  name: string;
  status: "draft" | "published" | "archived";
  schema: LayoutSchema;
};

export type AssetItem = {
  id: string;
  name: string;
  folder: string;
  tag: string;
  version: string;
  size: string;
};

export type DashboardData = {
  kpiMetrics: KpiMetric[];
  weeklyChart: ChartPoint[];
  monthlyChart: ChartPoint[];
  transactions: Transaction[];
  booths: Booth[];
};

function assertSupabaseResult<T>(data: T | null, error: { message: string } | null, label: string): T {
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }

  return data ?? ([] as T);
}

const mapChartPoint = ({ label, revenue, transactions, downloads }: ChartPointRow): ChartPoint => ({
  label,
  revenue,
  transactions,
  downloads: downloads ?? undefined,
});

const mapTransaction = (row: TransactionRow): Transaction => ({
  id: row.id,
  booth: row.booth,
  location: row.location,
  customer: row.customer,
  packageName: row.package_name,
  amount: row.amount,
  status: row.status,
  provider: row.provider,
  createdAt: row.created_at_label,
});

const mapBooth = (row: BoothRow): Booth => ({
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
});

const mapTemplate = (row: TemplateRow): Template => ({
  id: row.id,
  name: row.name,
  category: row.category,
  status: row.status,
  assignedBooths: row.assigned_booths,
  updatedAt: row.updated_at_label,
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

const mapTenant = (row: TenantRow): Tenant => ({
  id: row.id,
  name: row.name,
  plan: row.plan,
  status: row.status,
  booths: row.booths,
  users: row.users,
  renewalDate: row.renewal_date,
});

async function getKpiMetrics(): Promise<KpiMetric[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("kpi_metrics")
    .select("label,value,delta,tone,sort_order")
    .order("sort_order", { ascending: true });

  return assertSupabaseResult(data as KpiMetricRow[] | null, error, "Unable to load KPI metrics").map(({ label, value, delta, tone }) => ({
    label,
    value,
    delta,
    tone,
  }));
}

async function getChartPoints(period: "weekly" | "monthly"): Promise<ChartPoint[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chart_points")
    .select("id,period,label,revenue,transactions,downloads,sort_order")
    .eq("period", period)
    .order("sort_order", { ascending: true });

  return assertSupabaseResult(data as ChartPointRow[] | null, error, `Unable to load ${period} chart`).map(mapChartPoint);
}

async function getTransactions(): Promise<Transaction[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("id,booth,location,customer,package_name,amount,status,provider,created_at_label,created_at")
    .order("created_at", { ascending: false });

  return assertSupabaseResult(data as TransactionRow[] | null, error, "Unable to load transactions").map(mapTransaction);
}

async function getBooths(): Promise<Booth[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("booths")
    .select("id,name,location,status,battery,app_version,last_sync,theme,template,pricing_profile")
    .order("name", { ascending: true });

  return assertSupabaseResult(data as BoothRow[] | null, error, "Unable to load booths").map(mapBooth);
}

async function getTemplates(): Promise<Template[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("templates")
    .select("id,name,category,status,assigned_booths,updated_at_label")
    .order("updated_at", { ascending: false });

  return assertSupabaseResult(data as TemplateRow[] | null, error, "Unable to load templates").map(mapTemplate);
}

async function getPricingProducts(): Promise<PricingProduct[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pricing_products")
    .select("id,name,price,promo_price,print_limit,qris_download,gif_enabled,active")
    .order("price", { ascending: true });

  return assertSupabaseResult(data as PricingProductRow[] | null, error, "Unable to load pricing products").map(mapPricingProduct);
}

async function getTenants(): Promise<Tenant[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("id,name,plan,status,booths,users,renewal_date")
    .order("name", { ascending: true });

  return assertSupabaseResult(data as TenantRow[] | null, error, "Unable to load tenants").map(mapTenant);
}

async function getThemes(): Promise<ThemePreset[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("theme_presets")
    .select("id,name,status,schema")
    .order("name", { ascending: true });

  return assertSupabaseResult(data as ThemePresetRow[] | null, error, "Unable to load theme presets");
}

async function getAssets(): Promise<AssetItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("assets")
    .select("id,name,folder,tag,version,size")
    .order("folder", { ascending: true });

  return assertSupabaseResult(data as AssetItem[] | null, error, "Unable to load assets");
}

async function getLayoutSchema(): Promise<LayoutSchemaRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("layout_schemas")
    .select("id,name,status,schema")
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
  const [kpiMetrics, weeklyChart, monthlyChart, transactions, booths] = await Promise.all([
    getKpiMetrics(),
    getChartPoints("weekly"),
    getChartPoints("monthly"),
    getTransactions(),
    getBooths(),
  ]);

  return { kpiMetrics, weeklyChart, monthlyChart, transactions, booths };
}

export const adminService = {
  dashboard: getDashboard,
  transactions: getTransactions,
  booths: getBooths,
  templates: getTemplates,
  pricing: getPricingProducts,
  tenants: getTenants,
  themes: getThemes,
  assets: getAssets,
  layoutSchema: getLayoutSchema,
  publishLayoutSchema,
  publishThemeSchema,
};
