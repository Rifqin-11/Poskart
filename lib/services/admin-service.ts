import { createClient } from "@/lib/supabase/client";
import type { ChartPoint, KpiMetric } from "@/types/analytics";
import type { Booth } from "@/types/booth";
import type { LayoutSchema } from "@/types/builder";
import type { PricingProduct } from "@/types/pricing";
import type { Template, TemplateFormValues } from "@/types/template";
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
  tagline: string | null;
  photo_count: number;
  accent_color: string;
  frame_image_url: string | null;
  is_default: boolean;
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
  tagline: row.tagline ?? undefined,
  photoCount: row.photo_count ?? 4,
  accentColor: row.accent_color ?? "#C4121A",
  frameImageUrl: row.frame_image_url ?? undefined,
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
    .select("id,name,category,status,assigned_booths,updated_at_label,tagline,photo_count,accent_color,frame_image_url,is_default")
    .order("updated_at", { ascending: false });

  return assertSupabaseResult(data as TemplateRow[] | null, error, "Unable to load templates").map(mapTemplate);
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
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_at_label: "just now" };

  if (values.name !== undefined) patch.name = values.name;
  if (values.category !== undefined) patch.category = values.category;
  if (values.status !== undefined) patch.status = values.status;
  if (values.tagline !== undefined) patch.tagline = values.tagline || null;
  if (values.photoCount !== undefined) patch.photo_count = values.photoCount;
  if (values.accentColor !== undefined) patch.accent_color = values.accentColor;
  if (values.frameImageUrl !== undefined) patch.frame_image_url = values.frameImageUrl || null;
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

async function getLayoutSchemas(): Promise<LayoutSchemaRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("layout_schemas")
    .select("id,name,status,schema,is_active,created_at,updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Unable to load layout schemas: ${error.message}`);
  return (data ?? []) as LayoutSchemaRow[];
}

async function saveLayoutAsTheme(name: string, schema: LayoutSchema, existingId?: string): Promise<string> {
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
    .update({ is_active: true, status: "published", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (e2) throw new Error(`Unable to activate layout: ${e2.message}`);
}

async function deactivateLayout(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("layout_schemas")
    .update({ is_active: false, status: "draft", updated_at: new Date().toISOString() })
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
  createTemplate,
  updateTemplate,
  deleteTemplate,
  pricing: getPricingProducts,
  tenants: getTenants,
  themes: getThemes,
  assets: getAssets,
  layoutSchema: getLayoutSchema,
  layoutSchemas: getLayoutSchemas,
  publishLayoutSchema,
  publishThemeSchema,
  saveLayoutAsTheme,
  setActiveLayout,
  deactivateLayout,
  deleteLayout,
};
