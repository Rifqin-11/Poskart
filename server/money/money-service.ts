import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  MoneyCategory,
  MoneyEntry,
  MoneyEntryType,
  MoneyWalletType,
} from "@/types/money";

type MoneyEntryRow = {
  id: string;
  wallet_type: MoneyWalletType;
  entry_type: MoneyEntryType;
  category: MoneyCategory;
  amount: number;
  fee_percentage: number;
  title: string;
  notes: string | null;
  occurred_at: string;
  created_at: string;
};

export async function getMoneyEntries(): Promise<MoneyEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("money_entries")
    .select(
      "id,wallet_type,entry_type,category,amount,fee_percentage,title,notes,occurred_at,created_at",
    )
    .order("occurred_at", { ascending: false })
    .limit(2000);

  if (error) throw new Error(`Gagal memuat catatan uang: ${error.message}`);

  return ((data ?? []) as MoneyEntryRow[]).map((row) => ({
    id: row.id,
    walletType: row.wallet_type,
    entryType: row.entry_type,
    category: row.category,
    amount: Number(row.amount),
    feePercentage: Number(row.fee_percentage),
    title: row.title,
    notes: row.notes,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  }));
}
