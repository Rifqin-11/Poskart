import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  MoneyCategory,
  MoneyCustomCategory,
  MoneyEntry,
  MoneyEntryType,
  MoneyTag,
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

type MoneyCategoryRow = {
  id: string;
  entry_type: MoneyEntryType;
  name: string;
};

type MoneyTagRow = {
  id: string;
  name: string;
};

type MoneyEntryTagRow = {
  money_entry_id: string;
  money_tags: MoneyTagRow | MoneyTagRow[] | null;
};

export async function getMoneyEntries(): Promise<MoneyEntry[]> {
  const supabase = await createClient();
  const [{ data, error }, { data: tagLinks, error: tagLinksError }] =
    await Promise.all([
      supabase
        .from("money_entries")
        .select(
          "id,wallet_type,entry_type,category,amount,fee_percentage,title,notes,occurred_at,created_at",
        )
        .order("occurred_at", { ascending: false })
        .limit(2000),
      supabase
        .from("money_entry_tags")
        .select("money_entry_id,money_tags(id,name)"),
    ]);

  if (error) throw new Error(`Gagal memuat transaksi keuangan: ${error.message}`);
  if (tagLinksError)
    throw new Error(`Gagal memuat tag transaksi: ${tagLinksError.message}`);

  const tagsByEntry = new Map<string, MoneyTag[]>();
  for (const link of (tagLinks ?? []) as MoneyEntryTagRow[]) {
    const related = Array.isArray(link.money_tags)
      ? link.money_tags[0]
      : link.money_tags;
    if (!related) continue;
    const current = tagsByEntry.get(link.money_entry_id) ?? [];
    current.push({ id: related.id, name: related.name });
    tagsByEntry.set(link.money_entry_id, current);
  }

  return ((data ?? []) as MoneyEntryRow[]).map((row) => ({
    id: row.id,
    walletType: row.wallet_type,
    entryType: row.entry_type,
    category: row.category,
    amount: Number(row.amount),
    feePercentage: Number(row.fee_percentage),
    title: row.title,
    notes: row.notes,
    tags: (tagsByEntry.get(row.id) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name, "id"),
    ),
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  }));
}

export async function getMoneyTags(): Promise<MoneyTag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("money_tags")
    .select("id,name")
    .order("name");

  if (error) throw new Error(`Gagal memuat tag keuangan: ${error.message}`);
  return ((data ?? []) as MoneyTagRow[]).map((row) => ({
    id: row.id,
    name: row.name,
  }));
}

export async function getMoneyCategories(): Promise<MoneyCustomCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("money_categories")
    .select("id,entry_type,name")
    .order("name");

  if (error) throw new Error(`Gagal memuat kategori keuangan: ${error.message}`);

  return ((data ?? []) as MoneyCategoryRow[]).map((row) => ({
    id: row.id,
    entryType: row.entry_type,
    name: row.name,
  }));
}
