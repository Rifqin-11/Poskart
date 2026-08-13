"use server";

import { revalidatePath } from "next/cache";
import { hasOrganizationFeatureAccess } from "@/server/admin/organization-feature-access";
import { getAdminContext, getAdminMembership } from "@/server/admin/context";
import { calculatePhotoPricingQuote } from "@/lib/pricing/photo-slot-pricing";
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
    throw new Error("You do not have access to POS.");
  }
  return getPosSalesPage(filters);
}

export async function getPosSalesExportAction(
  filters: Partial<PosSaleFilters>,
) {
  if (!(await hasOrganizationFeatureAccess("posKasir"))) {
    throw new Error("You do not have access to POS.");
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
  const templateId = String(formData.get("templateId") ?? "").trim();

  if (!["Cash", "QRIS"].includes(paymentMethod)) {
    return { success: false, error: "Select a valid payment method." };
  }

  if (notes.length > 500) {
    return { success: false, error: "Notes must be 500 characters or less." };
  }

  const context = await getPosActionContext();
  if (!context) {
    return { success: false, error: "Account is not connected to an organization." };
  }
  const { supabase, user, organizationId } = context;

  const { data: selectedPackage, error: packageError } = await supabase
    .from("pricing_products")
    .select(
      "id,name,price,promo_price,pricing_mode,photo_slot_price,photo_slot_promo_price,photo_slot_prices,print_limit,active",
    )
    .eq("id", packageCode)
    .eq("organization_id", organizationId)
    .eq("active", true)
    .eq("access_mode", "paid")
    .maybeSingle();

  if (packageError) {
    return {
      success: false,
      error: `Failed to load package: ${packageError.message}`,
    };
  }

  if (!selectedPackage) {
    return { success: false, error: "Select a valid print package." };
  }

  let selectedTemplate: { id: string; photo_count: number } | null = null;
  if (templateId) {
    const { data, error: templateError } = await supabase
      .from("templates")
      .select("id,photo_count")
      .eq("id", templateId)
      .eq("organization_id", organizationId)
      .eq("status", "published")
      .maybeSingle();
    if (templateError) {
      return { success: false, error: `Failed to load frame: ${templateError.message}` };
    }
    selectedTemplate = data;
  }

  let quote;
  try {
    quote = calculatePhotoPricingQuote(
      {
        pricingMode:
          selectedPackage.pricing_mode === "per_photo_slot"
            ? "per_photo_slot"
            : "flat",
        price: selectedPackage.price,
        promoPrice: selectedPackage.promo_price,
        photoSlotPrice: selectedPackage.photo_slot_price,
        photoSlotPromoPrice: selectedPackage.photo_slot_promo_price,
        photoSlotPrices: selectedPackage.photo_slot_prices,
      },
      selectedTemplate?.photo_count,
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Harga paket tidak valid.",
    };
  }

  const { error } = await supabase.from("pos_sales").insert({
    organization_id: organizationId,
    package_code: packageCode,
    package_name: selectedPackage.name,
    print_count: Math.max(1, Number(selectedPackage.print_limit) || 1),
    amount: quote.amount,
    template_id: selectedTemplate?.id ?? null,
    pricing_mode: quote.pricingMode,
    pricing_unit_amount: quote.unitAmount,
    photo_slot_count: quote.photoSlotCount,
    pricing_snapshot: {
      mode: quote.pricingMode,
      unitAmount: quote.unitAmount,
      photoSlotCount: quote.photoSlotCount,
      finalAmount: quote.amount,
      templateId: selectedTemplate?.id ?? null,
    },
    payment_method: paymentMethod,
    notes: notes || null,
    created_by: user.id,
  });

  if (error) {
    return {
      success: false,
      error: `Failed to save transaction: ${error.message}`,
    };
  }

  revalidatePath("/pos");
  return { success: true };
}

export async function deletePosSale(saleId: string): Promise<PosActionState> {
  if (!saleId) {
    return { success: false, error: "Invalid transaction ID." };
  }

  const context = await getPosActionContext();
  if (!context) return { success: false, error: "Invalid POS access." };
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
      error: `Failed to delete transaction: ${error.message}`,
    };
  }

  if (!data) {
    return {
      success: false,
      error: "Transaction not found or could not be deleted.",
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
    return { success: false, error: "Invalid transaction amount." };
  }
  if (!Number.isFinite(printCount) || printCount < 1 || printCount > 100) {
    return { success: false, error: "Jumlah print harus antara 1-100." };
  }
  if (notes.length > 500) {
    return { success: false, error: "Notes must be 500 characters or less." };
  }

  const context = await getPosActionContext();
  if (!context) return { success: false, error: "Invalid POS access." };
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
      error: `Failed to update transaction: ${error.message}`,
    };
  if (!data) return { success: false, error: "Transaction not found." };

  revalidatePath("/pos");
  return { success: true };
}

export async function deletePosSales(
  saleIds: string[],
): Promise<PosActionState> {
  if (!saleIds || saleIds.length === 0) {
    return { success: false, error: "Invalid transaction ID." };
  }

  const context = await getPosActionContext();
  if (!context) return { success: false, error: "Invalid POS access." };
  const { supabase, organizationId } = context;

  const { error } = await supabase
    .from("pos_sales")
    .delete()
    .eq("organization_id", organizationId)
    .in("id", saleIds.slice(0, 100));

  if (error) {
    return {
      success: false,
      error: `Failed to delete transaction: ${error.message}`,
    };
  }

  revalidatePath("/pos");
  return { success: true };
}
