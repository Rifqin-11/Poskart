"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type {
  MoneyActionState,
  MoneyCategory,
  MoneyEntryInput,
  MoneyEntryType,
  MoneyWalletType,
} from "@/types/money";

const incomeCategories = new Set<MoneyCategory>([
  "opening_balance",
  "sales_income",
  "other_income",
  "correction",
]);
const expenseCategories = new Set<MoneyCategory>([
  "operational_expense",
  "purchase",
  "withdrawal",
  "correction",
  "other_expense",
]);

async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership?.organization_id) return null;
  return { supabase, user, organizationId: membership.organization_id };
}

function validateMoneyEntry(values: MoneyEntryInput): string | null {
  const amount = Math.round(Number(values.amount));
  const feePercentage = Number(values.feePercentage);
  if (!["cash", "qris"].includes(values.walletType)) {
    return "Dompet uang tidak valid.";
  }
  if (!["income", "expense"].includes(values.entryType)) {
    return "Jenis catatan uang tidak valid.";
  }
  const allowed =
    values.entryType === "income" ? incomeCategories : expenseCategories;
  if (!allowed.has(values.category)) {
    return "Kategori tidak sesuai dengan jenis transaksi.";
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Nominal harus lebih besar dari nol.";
  }
  if (
    !Number.isFinite(feePercentage) ||
    feePercentage < 0 ||
    feePercentage > 100
  ) {
    return "Potongan QRIS harus berada di antara 0 sampai 100 persen.";
  }
  if (!values.title.trim() || values.title.trim().length > 120) {
    return "Judul wajib diisi dan maksimal 120 karakter.";
  }
  if (values.notes.trim().length > 500) {
    return "Catatan maksimal 500 karakter.";
  }
  if (Number.isNaN(new Date(values.occurredAt).getTime())) {
    return "Tanggal transaksi tidak valid.";
  }
  return null;
}

function toDatabasePayload(
  values: MoneyEntryInput,
  organizationId: string,
  userId: string,
) {
  return {
    organization_id: organizationId,
    wallet_type: values.walletType as MoneyWalletType,
    entry_type: values.entryType as MoneyEntryType,
    category: values.category,
    amount: Math.round(Number(values.amount)),
    fee_percentage:
      values.walletType === "qris" && values.entryType === "income"
        ? Number(values.feePercentage)
        : 0,
    title: values.title.trim(),
    notes: values.notes.trim() || null,
    occurred_at: new Date(values.occurredAt).toISOString(),
    created_by: userId,
    updated_at: new Date().toISOString(),
  };
}

export async function saveMoneyEntry(
  values: MoneyEntryInput,
): Promise<MoneyActionState> {
  const validationError = validateMoneyEntry(values);
  if (validationError) return { success: false, error: validationError };

  const context = await getContext();
  if (!context)
    return { success: false, error: "Sesi atau organisasi tidak valid." };
  const payload = toDatabasePayload(
    values,
    context.organizationId,
    context.user.id,
  );

  const query = values.id
    ? context.supabase
        .from("money_entries")
        .update(payload)
        .eq("id", values.id)
        .eq("organization_id", context.organizationId)
    : context.supabase.from("money_entries").insert(payload);
  const { error } = await query;
  if (error)
    return { success: false, error: `Gagal menyimpan: ${error.message}` };

  revalidatePath("/money");
  return { success: true };
}

export async function deleteMoneyEntry(
  entryId: string,
): Promise<MoneyActionState> {
  const context = await getContext();
  if (!context)
    return { success: false, error: "Sesi atau organisasi tidak valid." };

  const { data, error } = await context.supabase
    .from("money_entries")
    .delete()
    .eq("id", entryId)
    .eq("organization_id", context.organizationId)
    .select("id")
    .maybeSingle();
  if (error)
    return { success: false, error: `Gagal menghapus: ${error.message}` };
  if (!data) return { success: false, error: "Catatan uang tidak ditemukan." };

  revalidatePath("/money");
  return { success: true };
}
