import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PosPackageCode, PosPaymentMethod, PosSale } from "@/types/pos";

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
