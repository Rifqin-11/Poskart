import "server-only";

import { getAdminContext, getAdminMembership } from "@/server/admin/context";
import type {
  PosPackageCode,
  PosPackageOption,
  PosPaymentMethod,
  PosSale,
  PosSaleFilters,
  PosSalesPage,
  PosSalesSummary,
} from "@/types/pos";

type PosSaleRow = {
  id: string;
  package_code: PosPackageCode;
  package_name: string;
  print_count: number;
  amount: number;
  payment_method: PosPaymentMethod;
  notes: string | null;
  created_at: string;
};

type PosSalePageRow = PosSaleRow & {
  full_count: number | string;
};

type PosSummaryRow = {
  revenue: number | string;
  prints: number | string;
  transactions: number | string;
};

type PosPackageRow = {
  id: string;
  name: string;
  price: number;
  promo_price: number | null;
  print_limit: number;
  qris_download: boolean;
  live_photo_enabled: boolean | null;
  gif_enabled: boolean;
  active: boolean;
};

const POS_SALE_COLUMNS =
  "id,package_code,package_name,print_count,amount,payment_method,notes,created_at";
const EXPORT_PAGE_SIZE = 500;

function mapPosSale(row: PosSaleRow): PosSale {
  return {
    id: row.id,
    packageCode: row.package_code,
    packageName: row.package_name,
    printCount: row.print_count,
    amount: row.amount,
    paymentMethod: row.payment_method,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapPosPackage(row: PosPackageRow): PosPackageOption {
  return {
    code: row.id,
    name: row.name,
    description: [
      `${row.print_limit} print`,
      row.qris_download ? "QR download" : null,
      (row.live_photo_enabled ?? row.gif_enabled) ? "Live Photo" : null,
      row.live_photo_enabled != null && row.gif_enabled ? "GIF" : null,
    ]
      .filter(Boolean)
      .join(" + "),
    printCount: row.print_limit,
    amount: row.promo_price ?? row.price,
    popular: Boolean(row.promo_price),
  };
}

function normalizeFilters(filters: Partial<PosSaleFilters>): PosSaleFilters {
  return {
    page: Math.max(1, Math.floor(Number(filters.page) || 1)),
    pageSize: Math.max(
      1,
      Math.min(100, Math.floor(Number(filters.pageSize) || 10)),
    ),
    search: String(filters.search ?? "").trim().slice(0, 100),
    packageCode: String(filters.packageCode ?? "all"),
    paymentMethod:
      filters.paymentMethod === "Cash" || filters.paymentMethod === "QRIS"
        ? filters.paymentMethod
        : "all",
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(filters.date ?? ""))
      ? String(filters.date)
      : "",
  };
}

function toRpcParams(filters: PosSaleFilters) {
  return {
    p_search: filters.search || null,
    p_package_code:
      filters.packageCode === "all" ? null : filters.packageCode,
    p_payment_method:
      filters.paymentMethod === "all" ? null : filters.paymentMethod,
    p_date: filters.date || null,
  };
}

function isMissingRpc(error: { code?: string | null }) {
  return error.code === "PGRST202" || error.code === "42883";
}

async function getLegacyPage(filters: PosSaleFilters) {
  const { supabase } = await getAdminContext();
  const membership = await getAdminMembership();
  if (!membership) throw new Error("Akun belum terhubung ke organisasi.");

  let query = supabase
    .from("pos_sales")
    .select(POS_SALE_COLUMNS, { count: "exact" })
    .eq("organization_id", membership.organizationId)
    .order("created_at", { ascending: false });

  if (filters.packageCode !== "all") {
    query = query.eq("package_code", filters.packageCode);
  }
  if (filters.paymentMethod !== "all") {
    query = query.eq("payment_method", filters.paymentMethod);
  }
  if (filters.date) {
    const start = `${filters.date}T00:00:00+07:00`;
    const endDate = new Date(`${filters.date}T00:00:00+07:00`);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    query = query.gte("created_at", start).lt("created_at", endDate.toISOString());
  }
  if (filters.search) {
    query = query.ilike("notes", `%${filters.search}%`);
  }

  const start = (filters.page - 1) * filters.pageSize;
  const { data, error, count } = await query.range(
    start,
    start + filters.pageSize - 1,
  );
  if (error) throw error;

  return {
    rows: (data ?? []) as PosSaleRow[],
    total: count ?? 0,
  };
}

async function getLegacySummary(filters: PosSaleFilters): Promise<PosSalesSummary> {
  const { supabase } = await getAdminContext();
  const membership = await getAdminMembership();
  if (!membership) throw new Error("Akun belum terhubung ke organisasi.");

  let query = supabase
    .from("pos_sales")
    .select("amount,print_count")
    .eq("organization_id", membership.organizationId);
  if (filters.packageCode !== "all") {
    query = query.eq("package_code", filters.packageCode);
  }
  if (filters.paymentMethod !== "all") {
    query = query.eq("payment_method", filters.paymentMethod);
  }
  if (filters.date) {
    const start = `${filters.date}T00:00:00+07:00`;
    const endDate = new Date(`${filters.date}T00:00:00+07:00`);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    query = query.gte("created_at", start).lt("created_at", endDate.toISOString());
  }
  if (filters.search) {
    query = query.ilike("notes", `%${filters.search}%`);
  }

  const { data, error } = await query.limit(5000);
  if (error) throw error;
  const rows = (data ?? []) as Array<{ amount: number; print_count: number }>;
  return {
    revenue: rows.reduce((sum, row) => sum + row.amount, 0),
    prints: rows.reduce((sum, row) => sum + row.print_count, 0),
    transactions: rows.length,
  };
}

export async function getPosSalesPage(
  input: Partial<PosSaleFilters> = {},
): Promise<PosSalesPage> {
  const filters = normalizeFilters(input);
  const { supabase } = await getAdminContext();
  const rpcParams = toRpcParams(filters);

  const [pageResult, summaryResult] = await Promise.all([
    supabase.rpc("get_pos_sales_page", {
      p_page: filters.page,
      p_page_size: filters.pageSize,
      ...rpcParams,
    }),
    supabase.rpc("get_pos_sales_summary", rpcParams),
  ]);

  if (pageResult.error || summaryResult.error) {
    const errors = [pageResult.error, summaryResult.error].filter(Boolean);
    if (errors.every((error) => error && isMissingRpc(error))) {
      const [page, summary] = await Promise.all([
        getLegacyPage(filters),
        getLegacySummary(filters),
      ]);
      return {
        sales: page.rows.map(mapPosSale),
        total: page.total,
        page: filters.page,
        pageSize: filters.pageSize,
        summary,
      };
    }
    throw new Error(
      `Gagal memuat data POS: ${pageResult.error?.message ?? summaryResult.error?.message}`,
    );
  }

  const pageRows = (pageResult.data ?? []) as PosSalePageRow[];
  const summaryRow = (summaryResult.data?.[0] ?? null) as PosSummaryRow | null;

  return {
    sales: pageRows.map(mapPosSale),
    total: Number(pageRows[0]?.full_count ?? summaryRow?.transactions ?? 0),
    page: filters.page,
    pageSize: filters.pageSize,
    summary: {
      revenue: Number(summaryRow?.revenue ?? 0),
      prints: Number(summaryRow?.prints ?? 0),
      transactions: Number(summaryRow?.transactions ?? 0),
    },
  };
}

export async function getPosSalesForExport(
  input: Partial<PosSaleFilters> = {},
): Promise<PosSale[]> {
  const filters = normalizeFilters({ ...input, page: 1, pageSize: EXPORT_PAGE_SIZE });
  const firstPage = await getPosSalesPage(filters);
  const sales = [...firstPage.sales];
  const totalPages = Math.ceil(firstPage.total / EXPORT_PAGE_SIZE);

  for (let page = 2; page <= totalPages; page += 1) {
    const result = await getPosSalesPage({ ...filters, page });
    sales.push(...result.sales);
  }

  return sales;
}

export async function getPosPackages(): Promise<PosPackageOption[]> {
  const { supabase } = await getAdminContext();
  const membership = await getAdminMembership();
  if (!membership) throw new Error("Akun belum terhubung ke organisasi.");

  const { data, error } = await supabase
    .from("pricing_products")
    .select(
      "id,name,price,promo_price,print_limit,qris_download,live_photo_enabled,gif_enabled,active",
    )
    .eq("organization_id", membership.organizationId)
    .eq("active", true)
    .order("price", { ascending: true });

  if (error) {
    throw new Error(`Gagal memuat paket POS: ${error.message}`);
  }

  return ((data ?? []) as PosPackageRow[]).map(mapPosPackage);
}
