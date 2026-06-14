import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  PosPackageCode,
  PosPackageOption,
  PosPaymentMethod,
  PosSale,
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
const PAGE_SIZE = 1000;

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

export async function getPosSales(): Promise<PosSale[]> {
  const supabase = await createClient();
  const sales: PosSaleRow[] = [];

  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("pos_sales")
      .select(POS_SALE_COLUMNS)
      .order("created_at", { ascending: false })
      .range(start, start + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Gagal memuat data POS: ${error.message}`);
    }

    const page = (data ?? []) as PosSaleRow[];
    sales.push(...page);

    if (page.length < PAGE_SIZE) break;
  }

  return sales.map(mapPosSale);
}

export async function getPosPackages(): Promise<PosPackageOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pricing_products")
    .select(
      "id,name,price,promo_price,print_limit,qris_download,live_photo_enabled,gif_enabled,active",
    )
    .eq("active", true)
    .order("price", { ascending: true });

  if (error) {
    throw new Error(`Gagal memuat paket POS: ${error.message}`);
  }

  return ((data ?? []) as PosPackageRow[]).map(mapPosPackage);
}
