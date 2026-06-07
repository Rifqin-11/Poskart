"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PosActionState, PosPackageCode, PosPaymentMethod } from "@/types/pos";

export async function createPosSale(
  formData: FormData,
): Promise<PosActionState> {
  const packageCode = String(formData.get("packageCode") ?? "") as PosPackageCode;
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

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "Sesi login tidak valid. Silakan login kembali." };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership?.organization_id) {
    return { success: false, error: "Akun belum terhubung ke organisasi." };
  }

  const { data: selectedPackage, error: packageError } = await supabase
    .from("pricing_products")
    .select("id,name,price,promo_price,print_limit,active")
    .eq("id", packageCode)
    .eq("active", true)
    .maybeSingle();

  if (packageError) {
    return { success: false, error: `Gagal memuat paket: ${packageError.message}` };
  }

  if (!selectedPackage) {
    return { success: false, error: "Pilih paket print yang valid." };
  }

  const { error } = await supabase.from("pos_sales").insert({
    organization_id: membership.organization_id,
    package_code: packageCode,
    package_name: selectedPackage.name,
    print_count: Math.max(1, Number(selectedPackage.print_limit) || 1),
    amount: Number(selectedPackage.promo_price ?? selectedPackage.price) || 0,
    payment_method: paymentMethod,
    notes: notes || null,
    created_by: user.id,
  });

  if (error) {
    return { success: false, error: `Gagal menyimpan transaksi: ${error.message}` };
  }

  revalidatePath("/pos");
  return { success: true };
}

export async function deletePosSale(saleId: string): Promise<PosActionState> {
  if (!saleId) {
    return { success: false, error: "ID transaksi tidak valid." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "Sesi login tidak valid. Silakan login kembali." };
  }

  const { data, error } = await supabase
    .from("pos_sales")
    .delete()
    .eq("id", saleId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, error: `Gagal menghapus transaksi: ${error.message}` };
  }

  if (!data) {
    return { success: false, error: "Transaksi tidak ditemukan atau tidak dapat dihapus." };
  }

  revalidatePath("/pos");
  return { success: true };
}
