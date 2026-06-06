"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PosActionState, PosPackageCode, PosPaymentMethod } from "@/types/pos";

const POS_PACKAGES = {
  print_1: { name: "1 Print", printCount: 1, amount: 6000 },
  print_2: { name: "2 Print", printCount: 2, amount: 10000 },
  print_3: { name: "3 Print", printCount: 3, amount: 14000 },
} satisfies Record<
  PosPackageCode,
  { name: string; printCount: number; amount: number }
>;

export async function createPosSale(
  formData: FormData,
): Promise<PosActionState> {
  const packageCode = String(formData.get("packageCode") ?? "") as PosPackageCode;
  const paymentMethod = String(
    formData.get("paymentMethod") ?? "",
  ) as PosPaymentMethod;
  const notes = String(formData.get("notes") ?? "").trim();
  const selectedPackage = POS_PACKAGES[packageCode];

  if (!selectedPackage) {
    return { success: false, error: "Pilih paket print yang valid." };
  }

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

  const { error } = await supabase.from("pos_sales").insert({
    organization_id: membership.organization_id,
    package_code: packageCode,
    package_name: selectedPackage.name,
    print_count: selectedPackage.printCount,
    amount: selectedPackage.amount,
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
