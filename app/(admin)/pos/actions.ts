"use server";

import { revalidatePath } from "next/cache";
import { hasOrganizationFeatureAccess } from "@/server/admin/organization-feature-access";
import { getAdminContext, getAdminMembership } from "@/server/admin/context";
import {
  getPosSalesForExport,
  getPosSalesPage,
} from "@/server/pos/pos-service";
import type {
  PosActionState,
  PosPackageCode,
  PosPaymentMethod,
  PosSaleFilters,
  PosSalesPage,
  PosSaleUpdate,
} from "@/types/pos";

async function getPosActionContext() {
  const [{ supabase, user }, membership, hasAccess] = await Promise.all([
    getAdminContext(),
    getAdminMembership(),
    hasOrganizationFeatureAccess("posKasir"),
  ]);

  if (!membership || !hasAccess) {
    return null;
  }

  return {
    supabase,
    user,
    organizationId: membership.organizationId,
  };
}

export async function getPosSalesPageAction(
  filters: Partial<PosSaleFilters>,
): Promise<PosSalesPage> {
  if (!(await hasOrganizationFeatureAccess("posKasir"))) {
    throw new Error("Anda tidak memiliki akses ke POS Kasir.");
  }
  return getPosSalesPage(filters);
}

export async function getPosSalesExportAction(
  filters: Partial<PosSaleFilters>,
) {
  if (!(await hasOrganizationFeatureAccess("posKasir"))) {
    throw new Error("Anda tidak memiliki akses ke POS Kasir.");
  }
  return getPosSalesForExport(filters);
}

export async function createPosSale(
  formData: FormData,
): Promise<PosActionState> {
  const packageCode = String(
    formData.get("packageCode") ?? "",
  ) as PosPackageCode;
  const paymentMethod = String(
    formData.get("paymentMethod") ?? "",
  ) as PosPaymentMethod;
  const notes = String(formData.get("notes") ?? "").trim();

  if (!["Cash", "QRIS"].includes(paymentMethod)) {
    return { success: false, error: "Pilih metode pembayaran yang valid." };
  }

  if (notes.length > 500) {
    return { success: false, error: "Catatan maksimal 500 karakter." };
  }

  const context = await getPosActionContext();
  if (!context) {
    return { success: false, error: "Akun belum terhubung ke organisasi." };
  }
  const { supabase, user, organizationId } = context;

  const { data: selectedPackage, error: packageError } = await supabase
    .from("pricing_products")
    .select("id,name,price,promo_price,print_limit,active")
    .eq("id", packageCode)
    .eq("organization_id", organizationId)
    .eq("active", true)
    .maybeSingle();

  if (packageError) {
    return {
      success: false,
      error: `Gagal memuat paket: ${packageError.message}`,
    };
  }

  if (!selectedPackage) {
    return { success: false, error: "Pilih paket print yang valid." };
  }

  const { error } = await supabase.from("pos_sales").insert({
    organization_id: organizationId,
    package_code: packageCode,
    package_name: selectedPackage.name,
    print_count: Math.max(1, Number(selectedPackage.print_limit) || 1),
    amount: Number(selectedPackage.promo_price ?? selectedPackage.price) || 0,
    payment_method: paymentMethod,
    notes: notes || null,
    created_by: user.id,
  });

  if (error) {
    return {
      success: false,
      error: `Gagal menyimpan transaksi: ${error.message}`,
    };
  }

  revalidatePath("/pos");
  return { success: true };
}

export async function deletePosSale(saleId: string): Promise<PosActionState> {
  if (!saleId) {
    return { success: false, error: "ID transaksi tidak valid." };
  }

  const context = await getPosActionContext();
  if (!context) return { success: false, error: "Akses POS tidak valid." };
  const { supabase, organizationId } = context;

  const { data, error } = await supabase
    .from("pos_sales")
    .delete()
    .eq("id", saleId)
    .eq("organization_id", organizationId)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      success: false,
      error: `Gagal menghapus transaksi: ${error.message}`,
    };
  }

  if (!data) {
    return {
      success: false,
      error: "Transaksi tidak ditemukan atau tidak dapat dihapus.",
    };
  }

  revalidatePath("/pos");
  return { success: true };
}

export async function updatePosSale(
  values: PosSaleUpdate,
): Promise<PosActionState> {
  const notes = values.notes.trim();
  const amount = Math.round(Number(values.amount));
  const printCount = Math.round(Number(values.printCount));

  if (!values.saleId || !values.packageCode) {
    return { success: false, error: "Data transaksi tidak lengkap." };
  }
  if (!["Cash", "QRIS"].includes(values.paymentMethod)) {
    return { success: false, error: "Metode pembayaran tidak valid." };
  }
  if (!Number.isFinite(amount) || amount < 0) {
    return { success: false, error: "Nominal transaksi tidak valid." };
  }
  if (!Number.isFinite(printCount) || printCount < 1 || printCount > 100) {
    return { success: false, error: "Jumlah print harus antara 1-100." };
  }
  if (notes.length > 500) {
    return { success: false, error: "Catatan maksimal 500 karakter." };
  }

  const context = await getPosActionContext();
  if (!context) return { success: false, error: "Akses POS tidak valid." };
  const { supabase, organizationId } = context;

  const { data: selectedPackage, error: packageError } = await supabase
    .from("pricing_products")
    .select("id,name")
    .eq("id", values.packageCode)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (packageError || !selectedPackage) {
    return { success: false, error: "Paket print tidak ditemukan." };
  }

  const { data, error } = await supabase
    .from("pos_sales")
    .update({
      package_code: selectedPackage.id,
      package_name: selectedPackage.name,
      print_count: printCount,
      amount,
      payment_method: values.paymentMethod,
      notes: notes || null,
    })
    .eq("id", values.saleId)
    .eq("organization_id", organizationId)
    .select("id")
    .maybeSingle();

  if (error)
    return {
      success: false,
      error: `Gagal mengubah transaksi: ${error.message}`,
    };
  if (!data) return { success: false, error: "Transaksi tidak ditemukan." };

  revalidatePath("/pos");
  return { success: true };
}

export async function deletePosSales(
  saleIds: string[],
): Promise<PosActionState> {
  if (!saleIds || saleIds.length === 0) {
    return { success: false, error: "ID transaksi tidak valid." };
  }

  const context = await getPosActionContext();
  if (!context) return { success: false, error: "Akses POS tidak valid." };
  const { supabase, organizationId } = context;

  const { error } = await supabase
    .from("pos_sales")
    .delete()
    .eq("organization_id", organizationId)
    .in("id", saleIds.slice(0, 100));

  if (error) {
    return {
      success: false,
      error: `Gagal menghapus transaksi: ${error.message}`,
    };
  }

  revalidatePath("/pos");
  return { success: true };
}
