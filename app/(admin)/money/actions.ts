"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { defaultMoneyWallets } from "@/features/money/money-dashboard.utils";
import type {
  MoneyActionState,
  MoneyCategoryInput,
  MoneyCategory,
  MoneyEntryInput,
  MoneyEntryType,
  MoneyTagInput,
  MoneyWalletInput,
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

const defaultCategoryNames: Record<MoneyCategory, string> = {
  opening_balance: "Saldo awal",
  sales_income: "Pendapatan penjualan",
  other_income: "Pendapatan lainnya",
  operational_expense: "Biaya operasional",
  purchase: "Pembelian",
  withdrawal: "Penarikan dana",
  correction: "Penyesuaian saldo",
  other_expense: "Pengeluaran lainnya",
};

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

async function validateMoneyEntry(
  values: MoneyEntryInput,
  context: NonNullable<Awaited<ReturnType<typeof getContext>>>,
): Promise<string | null> {
  const amount = Math.round(Number(values.amount));
  const feePercentage = Number(values.feePercentage);
  const walletIsDefault = defaultMoneyWallets.some(
    (wallet) => wallet.id === values.walletType,
  );
  if (!walletIsDefault) {
    const { data: wallet } = await context.supabase
      .from("money_wallets")
      .select("code")
      .eq("organization_id", context.organizationId)
      .eq("code", values.walletType)
      .maybeSingle();
    if (!wallet) {
      return "Dompet uang tidak valid.";
    }
  }
  if (!values.walletType.trim()) {
    return "Dompet uang tidak valid.";
  }
  if (!["income", "expense"].includes(values.entryType)) {
    return "Jenis transaksi tidak valid.";
  }
  const defaultAllowed =
    values.entryType === "income" ? incomeCategories : expenseCategories;
  if (!defaultAllowed.has(values.category)) {
    const { data: customCategory } = await context.supabase
      .from("money_categories")
      .select("id")
      .eq("organization_id", context.organizationId)
      .eq("entry_type", values.entryType)
      .eq("name", values.category)
      .maybeSingle();
    if (!customCategory) {
      return "Kategori tidak tersedia untuk jenis transaksi ini.";
    }
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
  const uniqueTagIds = Array.from(new Set(values.tagIds));
  if (uniqueTagIds.length > 10) {
    return "Maksimal 10 tag untuk setiap transaksi.";
  }
  if (uniqueTagIds.length) {
    const { data: validTags } = await context.supabase
      .from("money_tags")
      .select("id")
      .eq("organization_id", context.organizationId)
      .in("id", uniqueTagIds);
    if ((validTags ?? []).length !== uniqueTagIds.length) {
      return "Satu atau beberapa tag tidak valid untuk organisasi ini.";
    }
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
  const context = await getContext();
  if (!context)
    return { success: false, error: "Sesi atau organisasi tidak valid." };
  const validationError = await validateMoneyEntry(values, context);
  if (validationError) return { success: false, error: validationError };
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
        .select("id")
        .maybeSingle()
    : context.supabase.from("money_entries").insert(payload).select("id").single();
  const { data: savedEntry, error } = await query;
  if (error)
    return {
      success: false,
      error: `Gagal menyimpan transaksi: ${error.message}`,
    };
  if (!savedEntry)
    return { success: false, error: "Transaksi tidak ditemukan." };

  const { error: clearTagsError } = await context.supabase
    .from("money_entry_tags")
    .delete()
    .eq("money_entry_id", savedEntry.id)
    .eq("organization_id", context.organizationId);
  if (clearTagsError) {
    return {
      success: false,
      error: `Transaksi tersimpan, tetapi tag gagal diperbarui: ${clearTagsError.message}`,
    };
  }

  const uniqueTagIds = Array.from(new Set(values.tagIds));
  if (uniqueTagIds.length) {
    const { error: tagInsertError } = await context.supabase
      .from("money_entry_tags")
      .insert(
        uniqueTagIds.map((tagId) => ({
          organization_id: context.organizationId,
          money_entry_id: savedEntry.id,
          money_tag_id: tagId,
        })),
      );
    if (tagInsertError) {
      return {
        success: false,
        error: `Transaksi tersimpan, tetapi tag gagal ditambahkan: ${tagInsertError.message}`,
      };
    }
  }

  revalidatePath("/money");
  return { success: true };
}

export async function createMoneyTag(
  values: MoneyTagInput,
): Promise<MoneyActionState> {
  const context = await getContext();
  if (!context)
    return { success: false, error: "Sesi atau organisasi tidak valid." };

  const name = values.name.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 40) {
    return { success: false, error: "Nama tag harus 2-40 karakter." };
  }

  const { error } = await context.supabase.from("money_tags").insert({
    organization_id: context.organizationId,
    name,
    created_by: context.user.id,
  });
  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Tag dengan nama tersebut sudah ada." };
    }
    return { success: false, error: `Gagal membuat tag: ${error.message}` };
  }

  revalidatePath("/money");
  return { success: true };
}

export async function createMoneyWallet(
  values: MoneyWalletInput,
): Promise<MoneyActionState> {
  const context = await getContext();
  if (!context)
    return { success: false, error: "Sesi atau organisasi tidak valid." };

  const name = values.name.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 40) {
    return { success: false, error: "Nama dompet harus 2-40 karakter." };
  }
  if (
    defaultMoneyWallets.some(
      (wallet) => wallet.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    return { success: false, error: "Dompet tersebut sudah tersedia." };
  }

  const { error } = await context.supabase.from("money_wallets").insert({
    organization_id: context.organizationId,
    code: `wallet_${randomUUID()}`,
    name,
    created_by: context.user.id,
  });
  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Dompet dengan nama tersebut sudah ada." };
    }
    return { success: false, error: `Gagal membuat dompet: ${error.message}` };
  }

  revalidatePath("/money");
  return { success: true };
}

export async function deleteMoneyWallet(
  walletCode: string,
): Promise<MoneyActionState> {
  const context = await getContext();
  if (!context)
    return { success: false, error: "Sesi atau organisasi tidak valid." };
  if (defaultMoneyWallets.some((wallet) => wallet.id === walletCode)) {
    return { success: false, error: "Dompet bawaan tidak dapat dihapus." };
  }

  const { data: usedEntry, error: usedError } = await context.supabase
    .from("money_entries")
    .select("id")
    .eq("organization_id", context.organizationId)
    .eq("wallet_type", walletCode)
    .limit(1)
    .maybeSingle();
  if (usedError) {
    return {
      success: false,
      error: `Gagal memeriksa penggunaan dompet: ${usedError.message}`,
    };
  }
  if (usedEntry) {
    return {
      success: false,
      error: "Dompet sudah digunakan pada transaksi dan tidak dapat dihapus.",
    };
  }

  const { data, error } = await context.supabase
    .from("money_wallets")
    .delete()
    .eq("code", walletCode)
    .eq("organization_id", context.organizationId)
    .select("code")
    .maybeSingle();
  if (error)
    return { success: false, error: `Gagal menghapus dompet: ${error.message}` };
  if (!data) return { success: false, error: "Dompet tidak ditemukan." };

  revalidatePath("/money");
  return { success: true };
}

export async function deleteMoneyTag(
  tagId: string,
): Promise<MoneyActionState> {
  const context = await getContext();
  if (!context)
    return { success: false, error: "Sesi atau organisasi tidak valid." };

  const { data, error } = await context.supabase
    .from("money_tags")
    .delete()
    .eq("id", tagId)
    .eq("organization_id", context.organizationId)
    .select("id")
    .maybeSingle();
  if (error)
    return { success: false, error: `Gagal menghapus tag: ${error.message}` };
  if (!data) return { success: false, error: "Tag tidak ditemukan." };

  revalidatePath("/money");
  return { success: true };
}

export async function createMoneyCategory(
  values: MoneyCategoryInput,
): Promise<MoneyActionState> {
  const context = await getContext();
  if (!context)
    return { success: false, error: "Sesi atau organisasi tidak valid." };

  const name = values.name.trim().replace(/\s+/g, " ");
  if (!["income", "expense"].includes(values.entryType)) {
    return { success: false, error: "Jenis kategori tidak valid." };
  }
  if (name.length < 2 || name.length > 60) {
    return { success: false, error: "Nama kategori harus 2-60 karakter." };
  }
  if (
    Object.entries(defaultCategoryNames).some(
      ([key, label]) =>
        label.toLowerCase() === name.toLowerCase() &&
        (values.entryType === "income"
          ? incomeCategories
          : expenseCategories
        ).has(key),
    )
  ) {
    return { success: false, error: "Kategori tersebut sudah tersedia." };
  }

  const { error } = await context.supabase.from("money_categories").insert({
    organization_id: context.organizationId,
    entry_type: values.entryType,
    name,
    created_by: context.user.id,
  });
  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Kategori dengan nama tersebut sudah ada." };
    }
    return { success: false, error: `Gagal membuat kategori: ${error.message}` };
  }

  revalidatePath("/money");
  return { success: true };
}

export async function deleteMoneyCategory(
  categoryId: string,
): Promise<MoneyActionState> {
  const context = await getContext();
  if (!context)
    return { success: false, error: "Sesi atau organisasi tidak valid." };

  const { data, error } = await context.supabase
    .from("money_categories")
    .delete()
    .eq("id", categoryId)
    .eq("organization_id", context.organizationId)
    .select("id")
    .maybeSingle();
  if (error)
    return { success: false, error: `Gagal menghapus kategori: ${error.message}` };
  if (!data) return { success: false, error: "Kategori tidak ditemukan." };

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
    return { success: false, error: `Gagal menghapus transaksi: ${error.message}` };
  if (!data) return { success: false, error: "Transaksi tidak ditemukan." };

  revalidatePath("/money");
  return { success: true };
}
