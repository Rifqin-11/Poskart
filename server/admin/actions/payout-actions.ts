"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  getAdminContext,
  requireSuperAdmin as requireSuperAdminContext,
} from "@/server/admin/context";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createAdminNotification } from "@/server/admin/notifications";
import type {
  PayoutAccount,
  PayoutActionState,
  PayoutAvailableLedgerEntry,
  PayoutInvoice,
  PayoutInvoiceFilters,
  PayoutInvoiceItem,
  PayoutSettings,
  PayoutStatus,
  RequestPayoutInput,
  ReviewPayoutInput,
  SavePayoutSettingsInput,
  SavePayoutAccountInput,
} from "@/types/payout";

type MembershipRole = "owner" | "admin" | "designer" | "akuntan" | "partner";

type PayoutAccountRow = {
  id: string;
  organization_id: string;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

type EligibleLedgerEntryRow = {
  id: string;
  transaction_id: string | null;
  provider: string;
  merchant_order_id: string;
  duitku_reference: string | null;
  gross_amount: number;
  gateway_fee_amount: number;
  platform_fee_amount: number;
  adjustment_amount: number;
  net_amount: number;
  booth: string | null;
  package_name: string | null;
  paid_at: string | null;
  verified_at: string | null;
  created_at: string;
  verified_response: Record<string, unknown> | null;
};

type PayoutInvoiceRow = {
  id: string;
  invoice_number: string;
  organization_id: string;
  organizations?: { name: string } | { name: string }[] | null;
  status: PayoutStatus;
  gross_amount: number;
  gateway_fee_amount: number;
  platform_fee_amount: number;
  adjustment_amount: number;
  net_amount: number;
  requested_amount: number;
  requested_at: string;
  reviewed_at: string | null;
  paid_at: string | null;
  payment_reference: string | null;
  payment_proof_url: string | null;
  payment_proof_key: string | null;
  payment_proof_uploaded_at: string | null;
  notes: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  account_snapshot: Record<string, unknown> | null;
  fee_snapshot: Record<string, unknown> | null;
};

type PayoutInvoiceItemRow = {
  id: string;
  payout_invoice_id: string;
  ledger_entry_id: string | null;
  transaction_id: string | null;
  payment_gateway: string | null;
  booth: string | null;
  package_name: string | null;
  transaction_paid_at: string | null;
  gross_amount: number;
  gateway_fee_amount: number;
  platform_fee_amount: number;
  net_amount: number;
  created_at: string;
};

const DEFAULT_PAYOUT_SETTINGS: PayoutSettings = {
  gatewayFeeType: "percentage",
  gatewayFeePercentage: 0,
  gatewayFeeFixedAmount: 0,
  platformFeeType: "percentage",
  platformFeePercentage: 0,
  platformFeeFixedAmount: 0,
  minimumPayoutAmount: 0,
};

function mapPayoutAccount(row: PayoutAccountRow): PayoutAccount {
  return {
    id: row.id,
    organizationId: row.organization_id,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    accountHolderName: row.account_holder_name,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPayoutItem(row: PayoutInvoiceItemRow): PayoutInvoiceItem {
  return {
    id: row.id,
    ledgerEntryId: row.ledger_entry_id,
    transactionId: row.transaction_id,
    paymentGateway: row.payment_gateway,
    booth: row.booth,
    packageName: row.package_name,
    transactionPaidAt: row.transaction_paid_at,
    grossAmount: Number(row.gross_amount),
    gatewayFeeAmount: Number(row.gateway_fee_amount),
    platformFeeAmount: Number(row.platform_fee_amount),
    netAmount: Number(row.net_amount),
    createdAt: row.created_at,
  };
}

function mapPayoutInvoice(
  row: PayoutInvoiceRow,
  itemsByInvoice: Map<string, PayoutInvoiceItem[]>,
): PayoutInvoice {
  const organization = Array.isArray(row.organizations)
    ? row.organizations[0]
    : row.organizations;
  const accountSnapshot =
    row.account_snapshot && typeof row.account_snapshot === "object"
      ? row.account_snapshot
      : {};

  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    organizationId: row.organization_id,
    organizationName: organization?.name ?? null,
    status: row.status,
    grossAmount: Number(row.gross_amount),
    gatewayFeeAmount: Number(row.gateway_fee_amount),
    platformFeeAmount: Number(row.platform_fee_amount),
    adjustmentAmount: Number(row.adjustment_amount),
    netAmount: Number(row.net_amount),
    requestedAmount: Number(row.requested_amount),
    requestedAt: row.requested_at,
    reviewedAt: row.reviewed_at,
    paidAt: row.paid_at,
    paymentReference: row.payment_reference,
    paymentProofUrl: row.payment_proof_url,
    paymentProofKey: row.payment_proof_key,
    paymentProofUploadedAt: row.payment_proof_uploaded_at,
    notes: row.notes,
    reviewNotes: row.review_notes,
    rejectionReason: row.rejection_reason,
    accountSnapshot: {
      bankName: readString(accountSnapshot.bankName),
      accountNumber: readString(accountSnapshot.accountNumber),
      accountHolderName: readString(accountSnapshot.accountHolderName),
    },
    feeSnapshot: row.fee_snapshot ?? {},
    items: itemsByInvoice.get(row.id) ?? [],
  };
}

function readString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function isManageableRole(role?: string | null) {
  return role === "owner" || role === "admin" || role === "akuntan";
}

async function getOrganizationContext(options?: { requireManager?: boolean }) {
  const { supabase, user } = await getAdminContext();
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id,role")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Gagal memuat organisasi: ${error.message}`);
  if (!data?.organization_id) throw new Error("Organisasi tidak ditemukan.");

  const role = data.role as MembershipRole;
  if (options?.requireManager && !isManageableRole(role)) {
    throw new Error("Hanya owner/admin/akuntan organisasi yang bisa mengajukan payout.");
  }

  return { supabase, user, organizationId: data.organization_id as string, role };
}

async function requireSuperAdmin() {
  return requireSuperAdminContext();
}

async function getPayoutSettings(
  supabase: Awaited<ReturnType<typeof getAdminContext>>["supabase"],
): Promise<PayoutSettings> {
  const { data, error } = await supabase
    .from("app_configs")
    .select(
      "gateway_fee_type,gateway_fee_percentage,gateway_fee_fixed_amount,platform_fee_type,platform_fee_percentage,platform_fee_fixed_amount,minimum_payout_amount",
    )
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    if (error.code === "42703" || error.code === "42P01") {
      return DEFAULT_PAYOUT_SETTINGS;
    }
    throw new Error(`Gagal memuat setting payout: ${error.message}`);
  }

  return {
    gatewayFeeType: normalizeFeeType(data?.gateway_fee_type),
    gatewayFeePercentage: Number(data?.gateway_fee_percentage ?? 0),
    gatewayFeeFixedAmount: Number(data?.gateway_fee_fixed_amount ?? 0),
    platformFeeType: normalizeFeeType(data?.platform_fee_type),
    platformFeePercentage: Number(data?.platform_fee_percentage ?? 0),
    platformFeeFixedAmount: Number(data?.platform_fee_fixed_amount ?? 0),
    minimumPayoutAmount: Number(data?.minimum_payout_amount ?? 0),
  };
}

function calculateLine(row: EligibleLedgerEntryRow, settings: PayoutSettings) {
  const grossAmount = Number(row.gross_amount);
  const gatewayFeeAmount = calculateGatewayFee(row, settings, grossAmount);
  const platformFeeAmount = 0;

  return {
    ledgerEntryId: row.id,
    transactionId: row.transaction_id,
    paymentGateway: row.provider,
    booth: row.booth,
    packageName: row.package_name,
    transactionPaidAt: row.paid_at ?? row.created_at,
    grossAmount,
    gatewayFeeAmount,
    platformFeeAmount,
    netAmount: Math.max(0, grossAmount - gatewayFeeAmount - platformFeeAmount),
  };
}

function calculatePayoutPlatformFee(
  lineNetAmount: number,
  settings: PayoutSettings,
) {
  return calculateConfiguredFee(
    lineNetAmount,
    settings.platformFeeType,
    settings.platformFeePercentage,
    settings.platformFeeFixedAmount,
  );
}

function calculateGatewayFee(
  row: EligibleLedgerEntryRow,
  settings: PayoutSettings,
  grossAmount: number,
) {
  const feeFromDuitku = parseMoney(readObject(row.verified_response)?.fee);
  return (
    feeFromDuitku ??
    calculateConfiguredFee(
      grossAmount,
      settings.gatewayFeeType,
      settings.gatewayFeePercentage,
      settings.gatewayFeeFixedAmount,
    )
  );
}

function calculateConfiguredFee(
  grossAmount: number,
  feeType: "percentage" | "fixed",
  percentage: number,
  fixedAmount: number,
) {
  if (feeType === "fixed") {
    return Math.max(0, Math.round(Number(fixedAmount)));
  }
  return Math.max(0, Math.round((grossAmount * Number(percentage ?? 0)) / 100));
}

function readObject(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function parseMoney(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed)) return Math.max(0, Math.round(parsed));
  }
  return null;
}

async function notifySafely(
  supabase: Awaited<ReturnType<typeof getAdminContext>>["supabase"],
  input: Parameters<typeof createAdminNotification>[1],
) {
  try {
    await createAdminNotification(supabase, input);
  } catch (error) {
    console.error("[payout-notification]", error);
  }
}

function mapAvailableLedgerEntry(
  row: EligibleLedgerEntryRow,
  settings: PayoutSettings,
): PayoutAvailableLedgerEntry {
  const line = calculateLine(row, settings);

  return {
    id: row.id,
    transactionId: row.transaction_id,
    merchantOrderId: row.merchant_order_id,
    duitkuReference: row.duitku_reference,
    booth: row.booth,
    packageName: row.package_name,
    paidAt: row.paid_at,
    verifiedAt: row.verified_at,
    grossAmount: line.grossAmount,
    gatewayFeeAmount: line.gatewayFeeAmount,
    platformFeeAmount: line.platformFeeAmount,
    netAmount: line.netAmount,
  };
}

function isVerifiedDuitkuLedgerEntry(row: EligibleLedgerEntryRow) {
  const response = row.verified_response;
  if (!response || typeof response !== "object") return false;

  const isQrCreationPayload = Boolean(
    response.qrString ||
      response.qr_string ||
      response.paymentUrl ||
      response.payment_url,
  );

  if (isQrCreationPayload) return false;

  return Boolean(
    response.reference ||
      response.statusCode === "00" ||
      response.resultCode === "00" ||
      response.status === "SUCCESS",
  );
}

function sumLines(lines: ReturnType<typeof calculateLine>[]) {
  return lines.reduce(
    (acc, line) => ({
      grossAmount: acc.grossAmount + line.grossAmount,
      gatewayFeeAmount: acc.gatewayFeeAmount + line.gatewayFeeAmount,
      platformFeeAmount: acc.platformFeeAmount + line.platformFeeAmount,
      netAmount: acc.netAmount + line.netAmount,
    }),
    {
      grossAmount: 0,
      gatewayFeeAmount: 0,
      platformFeeAmount: 0,
      netAmount: 0,
    },
  );
}

async function getDefaultPayoutAccount(
  supabase: Awaited<ReturnType<typeof getAdminContext>>["supabase"],
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("organization_payout_accounts")
    .select(
      "id,organization_id,bank_name,account_number,account_holder_name,is_default,created_at,updated_at",
    )
    .eq("organization_id", organizationId)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01" || error.code === "42703") return null;
    throw new Error(`Gagal memuat rekening payout: ${error.message}`);
  }
  return data ? mapPayoutAccount(data as PayoutAccountRow) : null;
}

async function loadEligibleLedgerEntries(
  supabase: Awaited<ReturnType<typeof getAdminContext>>["supabase"],
  organizationId: string,
) {
  const rows: EligibleLedgerEntryRow[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("payment_ledger_entries")
      .select(
        "id,transaction_id,provider,merchant_order_id,duitku_reference,gross_amount,gateway_fee_amount,platform_fee_amount,adjustment_amount,net_amount,booth,package_name,paid_at,verified_at,created_at,verified_response",
      )
      .eq("organization_id", organizationId)
      .eq("status", "paid")
      .eq("provider", "duitku")
      .eq("payment_method", "QRIS")
      .eq("collection_mode", "platform")
      .is("settlement_status", null)
      .is("payout_invoice_id", null)
      .order("paid_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      if (error.code === "42P01" || error.code === "42703") return [];
      throw new Error(`Gagal memuat ledger eligible: ${error.message}`);
    }

    rows.push(
      ...((data ?? []) as EligibleLedgerEntryRow[]).filter(
        isVerifiedDuitkuLedgerEntry,
      ),
    );
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

async function loadInvoices(
  supabase: Awaited<ReturnType<typeof getAdminContext>>["supabase"],
  filters: PayoutInvoiceFilters & { organizationId?: string } = {},
) {
  let query = supabase
    .from("payout_invoices")
    .select(
      "id,invoice_number,organization_id,organizations(name),status,gross_amount,gateway_fee_amount,platform_fee_amount,adjustment_amount,net_amount,requested_amount,requested_at,reviewed_at,paid_at,payment_reference,payment_proof_url,payment_proof_key,payment_proof_uploaded_at,notes,review_notes,rejection_reason,account_snapshot,fee_snapshot",
    )
    .order("requested_at", { ascending: false });

  if (filters.organizationId) {
    query = query.eq("organization_id", filters.organizationId);
  }
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.dateFrom) {
    query = query.gte("requested_at", new Date(filters.dateFrom).toISOString());
  }
  if (filters.dateTo) {
    const end = new Date(filters.dateTo);
    end.setHours(23, 59, 59, 999);
    query = query.lte("requested_at", end.toISOString());
  }

  const { data, error } = await query.limit(500);
  if (error) {
    if (error.code === "42P01" || error.code === "42703") return [];
    throw new Error(`Gagal memuat payout invoice: ${error.message}`);
  }

  let rows = (data ?? []) as PayoutInvoiceRow[];
  const invoiceIds = rows.map((row) => row.id);
  const itemsByInvoice = new Map<string, PayoutInvoiceItem[]>();

  if (invoiceIds.length) {
    let itemQuery = supabase
      .from("payout_invoice_items")
      .select(
        "id,payout_invoice_id,ledger_entry_id,transaction_id,payment_gateway,booth,package_name,transaction_paid_at,gross_amount,gateway_fee_amount,platform_fee_amount,net_amount,created_at",
      )
      .in("payout_invoice_id", invoiceIds)
      .order("transaction_paid_at", { ascending: true });

    if (filters.paymentGateway) {
      itemQuery = itemQuery.eq("payment_gateway", filters.paymentGateway);
    }

    const { data: itemRows, error: itemError } = await itemQuery;
    if (itemError) {
      throw new Error(`Gagal memuat item payout: ${itemError.message}`);
    }

    const matchingInvoiceIds = new Set<string>();
    for (const item of (itemRows ?? []) as PayoutInvoiceItemRow[]) {
      matchingInvoiceIds.add(item.payout_invoice_id);
      const current = itemsByInvoice.get(item.payout_invoice_id) ?? [];
      current.push(mapPayoutItem(item));
      itemsByInvoice.set(item.payout_invoice_id, current);
    }

    if (filters.paymentGateway) {
      rows = rows.filter((row) => matchingInvoiceIds.has(row.id));
    }
  }

  return rows.map((row) => mapPayoutInvoice(row, itemsByInvoice));
}

export async function getMyPayoutSummary() {
  const { supabase, organizationId } = await getOrganizationContext();
  const [settings, payoutAccount, eligibleRows, invoices] = await Promise.all([
    getPayoutSettings(supabase),
    getDefaultPayoutAccount(supabase, organizationId),
    loadEligibleLedgerEntries(supabase, organizationId),
    loadInvoices(supabase, { organizationId }),
  ]);

  const lines = eligibleRows.map((row) => calculateLine(row, settings));
  const available = sumLines(lines);
  const pendingNetAmount = invoices
    .filter((invoice) => ["requested", "approved"].includes(invoice.status))
    .reduce((sum, invoice) => sum + invoice.netAmount, 0);
  const paidNetAmount = invoices
    .filter((invoice) => invoice.status === "paid")
    .reduce((sum, invoice) => sum + invoice.netAmount, 0);

  return {
    availableGrossAmount: available.grossAmount,
    availableGatewayFeeAmount: available.gatewayFeeAmount,
    availablePlatformFeeAmount: available.platformFeeAmount,
    availableNetAmount: available.netAmount,
    pendingNetAmount,
    paidNetAmount,
    eligibleTransactionCount: lines.length,
    pendingInvoiceCount: invoices.filter((invoice) =>
      ["requested", "approved"].includes(invoice.status),
    ).length,
    settings,
    payoutAccount,
  };
}

export async function getMyPayoutInvoices() {
  const { supabase, organizationId } = await getOrganizationContext();
  return loadInvoices(supabase, { organizationId });
}

export async function getMyAvailablePayoutLedgerEntries() {
  const { supabase, organizationId } = await getOrganizationContext();
  const [settings, rows] = await Promise.all([
    getPayoutSettings(supabase),
    loadEligibleLedgerEntries(supabase, organizationId),
  ]);
  return rows.map((row) => mapAvailableLedgerEntry(row, settings));
}

export async function saveMyPayoutAccount(
  values: SavePayoutAccountInput,
): Promise<PayoutActionState> {
  try {
    const { supabase, organizationId, role } = await getOrganizationContext({
      requireManager: true,
    });
    
    if (role === "akuntan") {
      return { success: false, error: "Hanya owner atau admin yang dapat mengubah rekening pencairan." };
    }

    const bankName = values.bankName.trim();
    const accountNumber = values.accountNumber.trim();
    const accountHolderName = values.accountHolderName.trim();

    if (!bankName || !accountNumber || !accountHolderName) {
      return { success: false, error: "Data rekening payout wajib lengkap." };
    }

    await supabase
      .from("organization_payout_accounts")
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq("organization_id", organizationId);

    const existing = await getDefaultPayoutAccount(supabase, organizationId);
    const payload = {
      organization_id: organizationId,
      bank_name: bankName,
      account_number: accountNumber,
      account_holder_name: accountHolderName,
      is_default: true,
      updated_at: new Date().toISOString(),
    };

    const { error } = existing
      ? await supabase
          .from("organization_payout_accounts")
          .update(payload)
          .eq("id", existing.id)
          .eq("organization_id", organizationId)
      : await supabase.from("organization_payout_accounts").insert(payload);

    if (error) {
      return { success: false, error: `Gagal menyimpan rekening: ${error.message}` };
    }

    revalidatePath("/invoices");
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan rekening.",
    };
  }
}

export async function requestPayout(
  values: RequestPayoutInput,
): Promise<PayoutActionState> {
  try {
    const { supabase, user, organizationId, role } = await getOrganizationContext({
      requireManager: true,
    });
    const isAccountant = role === "akuntan";
    const initialStatus = isAccountant ? "pending_approval" : "requested";
    const ledgerClient = createSupabaseAdminClient();
    const requestedAmount = Math.round(Number(values.amount));
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return { success: false, error: "Nominal pencairan tidak valid." };
    }

    const [settings, account, eligibleRows] = await Promise.all([
      getPayoutSettings(supabase),
      getDefaultPayoutAccount(supabase, organizationId),
      loadEligibleLedgerEntries(ledgerClient, organizationId),
    ]);

    if (!account || account.id !== values.accountId) {
      return { success: false, error: "Rekening payout tidak valid." };
    }
    if (
      settings.minimumPayoutAmount > 0 &&
      requestedAmount < settings.minimumPayoutAmount
    ) {
      return {
        success: false,
        error: `Minimum pencairan adalah Rp ${settings.minimumPayoutAmount.toLocaleString("id-ID")}.`,
      };
    }

    const selectedLines: ReturnType<typeof calculateLine>[] = [];
    let selectedNetAmount = 0;

    for (const row of eligibleRows) {
      const line = calculateLine(row, settings);
      if (line.netAmount <= 0) continue;
      if (
        selectedLines.length > 0 &&
        selectedNetAmount + line.netAmount > requestedAmount
      ) {
        break;
      }
      if (
        selectedLines.length === 0 &&
        line.netAmount > requestedAmount
      ) {
        break;
      }
      selectedLines.push(line);
      selectedNetAmount += line.netAmount;
    }

    if (selectedLines.length === 0) {
      return {
        success: false,
        error:
          "Tidak ada transaksi eligible yang cocok dengan nominal pencairan.",
      };
    }

    const totals = sumLines(selectedLines);
    const platformFeeAmount = calculatePayoutPlatformFee(
      totals.netAmount,
      settings,
    );
    const invoiceNetAmount = Math.max(0, totals.netAmount - platformFeeAmount);
    const now = new Date().toISOString();
    const invoiceNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const accountSnapshot = {
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountHolderName: account.accountHolderName,
    };
    const feeSnapshot = {
      gatewayFeeType: settings.gatewayFeeType,
      gatewayFeePercentage: settings.gatewayFeePercentage,
      gatewayFeeFixedAmount: settings.gatewayFeeFixedAmount,
      platformFeeType: settings.platformFeeType,
      platformFeePercentage: settings.platformFeePercentage,
      platformFeeFixedAmount: settings.platformFeeFixedAmount,
      minimumPayoutAmount: settings.minimumPayoutAmount,
      source: "request",
    };

    const { data: invoice, error: invoiceError } = await ledgerClient
      .from("payout_invoices")
      .insert({
        invoice_number: invoiceNumber,
        organization_id: organizationId,
        payout_account_id: account.id,
        status: initialStatus,
        gross_amount: totals.grossAmount,
        gateway_fee_amount: totals.gatewayFeeAmount,
        platform_fee_amount: platformFeeAmount,
        adjustment_amount: 0,
        net_amount: invoiceNetAmount,
        requested_amount: requestedAmount,
        requested_by: user.id,
        requested_at: now,
        notes: values.notes?.trim() || null,
        account_snapshot: accountSnapshot,
        fee_snapshot: feeSnapshot,
        updated_at: now,
      })
      .select("id")
      .single();

    if (invoiceError || !invoice?.id) {
      return {
        success: false,
        error: `Gagal membuat invoice payout: ${invoiceError?.message ?? "invoice kosong"}`,
      };
    }

    const ledgerEntryIds = selectedLines.map((line) => line.ledgerEntryId);
    const transactionIds = selectedLines
      .map((line) => line.transactionId)
      .filter((id): id is string => Boolean(id));
    const { data: lockedRows, error: lockError } = await ledgerClient
      .from("payment_ledger_entries")
      .update({
        settlement_status: initialStatus,
        payout_invoice_id: invoice.id,
        updated_at: now,
      })
      .in("id", ledgerEntryIds)
      .eq("organization_id", organizationId)
      .is("settlement_status", null)
      .is("payout_invoice_id", null)
      .select("id");

    const lockedIds = new Set((lockedRows ?? []).map((row) => row.id as string));
    if (lockError || lockedIds.size !== ledgerEntryIds.length) {
      await ledgerClient
        .from("payment_ledger_entries")
        .update({
          settlement_status: null,
          payout_invoice_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("payout_invoice_id", invoice.id);
      await ledgerClient
        .from("payout_invoices")
        .update({
          status: "canceled",
          rejection_reason: "Transaksi berubah saat request payout dibuat.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);

      return {
        success: false,
        error:
          lockError?.message ??
          "Sebagian ledger pembayaran sudah masuk invoice lain. Coba refresh halaman.",
      };
    }

    await ledgerClient
      .from("transactions")
      .update({
        payout_status: initialStatus,
        payout_invoice_id: invoice.id,
        updated_at: now,
      })
      .in("id", transactionIds.length ? transactionIds : ["__none__"])
      .eq("organization_id", organizationId);

    const { error: itemError } = await ledgerClient
      .from("payout_invoice_items")
      .insert(
        selectedLines.map((line) => ({
          payout_invoice_id: invoice.id,
          organization_id: organizationId,
          ledger_entry_id: line.ledgerEntryId,
          transaction_id: line.transactionId,
          payment_gateway: line.paymentGateway,
          booth: line.booth,
          package_name: line.packageName,
          transaction_paid_at: line.transactionPaidAt,
          gross_amount: line.grossAmount,
          gateway_fee_amount: line.gatewayFeeAmount,
          platform_fee_amount: line.platformFeeAmount,
          net_amount: line.netAmount,
        })),
      );

    if (itemError) {
      await ledgerClient
        .from("payment_ledger_entries")
        .update({
          settlement_status: null,
          payout_invoice_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("payout_invoice_id", invoice.id);
      await ledgerClient
        .from("transactions")
        .update({
          payout_status: null,
          payout_invoice_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("payout_invoice_id", invoice.id);
      await ledgerClient
        .from("payout_invoices")
        .update({
          status: "canceled",
          rejection_reason: "Item invoice gagal dibuat.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);

      return {
        success: false,
        error: `Gagal membuat item invoice: ${itemError.message}`,
      };
    }

    revalidatePath("/invoices");
    revalidatePath("/superadmin");
    if (isAccountant) {
      await notifySafely(ledgerClient, {
        audience: "organization",
        type: "payout.needs_approval",
        title: "Persetujuan Pencairan",
        body: `Akuntan mengajukan draf pencairan sebesar Rp ${invoiceNetAmount.toLocaleString("id-ID")}. Mohon ditinjau.`,
        href: "/invoices",
        organizationId,
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber,
        },
      });
    } else {
      await notifySafely(ledgerClient, {
        audience: "superadmin",
        type: "payout.requested",
        title: "Request pencairan baru",
        body: `${invoiceNumber} menunggu review Super Admin.`,
        href: "/superadmin",
        organizationId,
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber,
          netAmount: invoiceNetAmount,
        },
      });
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal request payout.",
    };
  }
}

export async function getPayoutInvoicesForSuperadmin(
  filters: PayoutInvoiceFilters = {},
) {
  const { supabase } = await requireSuperAdmin();
  return loadInvoices(supabase, filters);
}

export async function getPayoutSettingsForSuperadmin() {
  const { supabase } = await requireSuperAdmin();
  return getPayoutSettings(supabase);
}

export async function savePayoutSettingsForSuperadmin(
  values: SavePayoutSettingsInput,
): Promise<PayoutActionState> {
  try {
    const { supabase } = await requireSuperAdmin();
    const gatewayFeeType = normalizeFeeType(values.gatewayFeeType);
    const gatewayFeePercentage = normalizePercentage(
      values.gatewayFeePercentage,
    );
    const gatewayFeeFixedAmount = normalizeMoney(values.gatewayFeeFixedAmount);
    const platformFeeType = normalizeFeeType(values.platformFeeType);
    const platformFeePercentage = normalizePercentage(
      values.platformFeePercentage,
    );
    const platformFeeFixedAmount = normalizeMoney(
      values.platformFeeFixedAmount,
    );
    const minimumPayoutAmount = Math.max(
      0,
      Math.round(Number(values.minimumPayoutAmount ?? 0)),
    );

    const { error } = await supabase.from("app_configs").upsert({
      id: "default",
      gateway_fee_type: gatewayFeeType,
      gateway_fee_percentage: gatewayFeePercentage,
      gateway_fee_fixed_amount: gatewayFeeFixedAmount,
      platform_fee_type: platformFeeType,
      platform_fee_percentage: platformFeePercentage,
      platform_fee_fixed_amount: platformFeeFixedAmount,
      payout_adjustment_amount: 0,
      minimum_payout_amount: Number.isFinite(minimumPayoutAmount)
        ? minimumPayoutAmount
        : 0,
      updated_at: new Date().toISOString(),
    });

    if (error) return { success: false, error: error.message };
    revalidatePath("/superadmin");
    revalidatePath("/invoices");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal menyimpan payout setting.",
    };
  }
}

function normalizePercentage(value: unknown) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

function normalizeMoney(value: unknown) {
  const parsed = Math.round(Number(value ?? 0));
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

function normalizeFeeType(value: unknown) {
  return value === "fixed" ? "fixed" : "percentage";
}

export async function approvePayoutInvoice(
  id: string,
  reviewPatch: ReviewPayoutInput,
): Promise<PayoutActionState> {
  try {
    const { supabase, user } = await requireSuperAdmin();
    const ledgerClient = createSupabaseAdminClient();

    const { data: invoice, error: invoiceError } = await supabase
      .from("payout_invoices")
      .select("id,invoice_number,organization_id,status,net_amount")
      .eq("id", id)
      .maybeSingle();

    if (invoiceError) throw invoiceError;
    if (!invoice) return { success: false, error: "Invoice tidak ditemukan." };
    if (!["requested", "approved"].includes(invoice.status as string)) {
      return { success: false, error: "Invoice tidak bisa di-approve." };
    }

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("payout_invoices")
      .update({
        status: "approved",
        review_notes: reviewPatch.reviewNotes?.trim() || null,
        reviewed_by: user.id,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    await ledgerClient
      .from("payment_ledger_entries")
      .update({ settlement_status: "approved", updated_at: now })
      .eq("payout_invoice_id", id);

    await ledgerClient
      .from("transactions")
      .update({ payout_status: "approved", updated_at: now })
      .eq("payout_invoice_id", id);

    revalidatePath("/invoices");
    revalidatePath("/superadmin");
    await notifySafely(ledgerClient, {
      audience: "organization",
      organizationId: invoice.organization_id as string,
      type: "payout.approved",
      title: "Pencairan disetujui",
      body: `${invoice.invoice_number} sudah disetujui dan menunggu transfer.`,
      href: "/invoices",
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        netAmount: invoice.net_amount,
      },
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal approve invoice.",
    };
  }
}

export async function rejectPayoutInvoice(
  id: string,
  reason: string,
): Promise<PayoutActionState> {
  try {
    const { supabase, user } = await requireSuperAdmin();
    const ledgerClient = createSupabaseAdminClient();
    const now = new Date().toISOString();
    const { data: invoice, error: invoiceError } = await supabase
      .from("payout_invoices")
      .select("id,invoice_number,organization_id,net_amount")
      .eq("id", id)
      .maybeSingle();

    if (invoiceError) throw invoiceError;
    if (!invoice) return { success: false, error: "Invoice tidak ditemukan." };

    const { error } = await supabase
      .from("payout_invoices")
      .update({
        status: "rejected",
        rejection_reason: reason.trim() || "Rejected by superadmin",
        reviewed_by: user.id,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", id)
      .in("status", ["requested", "approved"]);

    if (error) return { success: false, error: error.message };

    await ledgerClient
      .from("payment_ledger_entries")
      .update({
        settlement_status: null,
        payout_invoice_id: null,
        updated_at: now,
      })
      .eq("payout_invoice_id", id);

    await ledgerClient
      .from("transactions")
      .update({
        payout_status: null,
        payout_invoice_id: null,
        updated_at: now,
      })
      .eq("payout_invoice_id", id);

    revalidatePath("/invoices");
    revalidatePath("/superadmin");
    await notifySafely(ledgerClient, {
      audience: "organization",
      organizationId: invoice.organization_id as string,
      type: "payout.rejected",
      title: "Pencairan ditolak",
      body: `${invoice.invoice_number} ditolak. Saldo dikembalikan ke eligible payout.`,
      href: "/invoices",
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        netAmount: invoice.net_amount,
      },
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal reject invoice.",
    };
  }
}

export async function markPayoutInvoicePaid(
  id: string,
  paymentReference: string,
  paidAt?: string,
  proof?: { url?: string | null; key?: string | null },
): Promise<PayoutActionState> {
  try {
    const { supabase, user } = await requireSuperAdmin();
    const ledgerClient = createSupabaseAdminClient();
    const now = new Date().toISOString();
    const paymentReferenceValue = paymentReference.trim();
    const proofUrl = proof?.url?.trim() ?? "";
    const proofKey = proof?.key?.trim() ?? "";

    if (!paymentReferenceValue) {
      return { success: false, error: "Referensi transfer wajib diisi." };
    }
    if (!proofUrl || !proofKey) {
      return { success: false, error: "Bukti transfer wajib diupload." };
    }

    const parsedPaidAt = paidAt ? new Date(paidAt) : null;
    if (paidAt && Number.isNaN(parsedPaidAt?.getTime())) {
      return { success: false, error: "Tanggal transfer tidak valid." };
    }
    const paidAtValue = parsedPaidAt ? parsedPaidAt.toISOString() : now;

    const { data: invoice, error: invoiceError } = await supabase
      .from("payout_invoices")
      .select("id,invoice_number,organization_id,net_amount")
      .eq("id", id)
      .maybeSingle();

    if (invoiceError) throw invoiceError;
    if (!invoice) return { success: false, error: "Invoice tidak ditemukan." };

    const { data: updatedInvoice, error } = await supabase
      .from("payout_invoices")
      .update({
        status: "paid",
        paid_by: user.id,
        paid_at: paidAtValue,
        payment_reference: paymentReferenceValue,
        payment_proof_url: proofUrl,
        payment_proof_key: proofKey,
        payment_proof_uploaded_at: now,
        reviewed_at: now,
        reviewed_by: user.id,
        updated_at: now,
      })
      .eq("id", id)
      .in("status", ["requested", "approved"])
      .select("id")
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    if (!updatedInvoice) {
      return {
        success: false,
        error: "Invoice tidak dalam status yang bisa ditandai paid.",
      };
    }

    await ledgerClient
      .from("payment_ledger_entries")
      .update({ settlement_status: "paid", updated_at: now })
      .eq("payout_invoice_id", id);

    await ledgerClient
      .from("transactions")
      .update({ payout_status: "paid", updated_at: now })
      .eq("payout_invoice_id", id);

    revalidatePath("/invoices");
    revalidatePath("/superadmin");
    await notifySafely(ledgerClient, {
      audience: "organization",
      organizationId: invoice.organization_id as string,
      type: "payout.paid",
      title: "Pencairan sudah ditransfer",
      body: `${invoice.invoice_number} sudah ditandai cair.`,
      href: "/invoices",
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        netAmount: invoice.net_amount,
      },
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mark paid.",
    };
  }
}

export async function approveInternalPayoutRequest(
  invoiceId: string,
): Promise<PayoutActionState> {
  try {
    const { supabase, user, organizationId, role } = await getOrganizationContext({
      requireManager: true,
    });
    
    if (role === "akuntan") {
      return { success: false, error: "Hanya owner atau admin yang dapat menyetujui pencairan." };
    }

    const ledgerClient = createSupabaseAdminClient();
    const now = new Date().toISOString();

    const { data: invoice, error: fetchError } = await supabase
      .from("payout_invoices")
      .select("id, status, invoice_number, net_amount, requested_by")
      .eq("id", invoiceId)
      .eq("organization_id", organizationId)
      .single();

    if (fetchError || !invoice) {
      return { success: false, error: "Invoice tidak ditemukan." };
    }

    if (invoice.status !== "pending_approval") {
      return { success: false, error: "Invoice tidak dalam status pending_approval." };
    }

    // Update the invoice status
    const { error: updateError } = await supabase
      .from("payout_invoices")
      .update({
        status: "requested",
        reviewed_by: user.id,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", invoiceId);

    if (updateError) {
      return { success: false, error: "Gagal menyetujui invoice." };
    }

    // Update related transactions and payment_ledger_entries status
    await ledgerClient
      .from("transactions")
      .update({ payout_status: "requested", updated_at: now })
      .eq("payout_invoice_id", invoiceId);

    await ledgerClient
      .from("payment_ledger_entries")
      .update({ settlement_status: "requested", updated_at: now })
      .eq("payout_invoice_id", invoiceId);

    revalidatePath("/invoices");
    revalidatePath("/superadmin");
    
    // Notify superadmin
    await notifySafely(ledgerClient, {
      audience: "superadmin",
      type: "payout.requested",
      title: "Request pencairan disetujui internal",
      body: `${invoice.invoice_number} disetujui owner/admin dan menunggu review Super Admin.`,
      href: "/superadmin",
      organizationId,
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        netAmount: invoice.net_amount,
      },
    });

    // Notify the accountant who requested it
    if (invoice.requested_by) {
       await notifySafely(ledgerClient, {
         audience: "user",
         recipientProfileId: invoice.requested_by,
         organizationId,
         type: "payout.approved_internal",
         title: "Draf Pencairan Disetujui",
         body: `Draf pencairan ${invoice.invoice_number} telah disetujui dan diteruskan ke Platform.`,
         href: "/invoices",
       });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyetujui payout.",
    };
  }
}

export async function rejectInternalPayoutRequest(
  invoiceId: string,
  reason: string,
): Promise<PayoutActionState> {
  try {
    const { supabase, user, organizationId, role } = await getOrganizationContext({
      requireManager: true,
    });
    
    if (role === "akuntan") {
      return { success: false, error: "Hanya owner atau admin yang dapat menolak pencairan." };
    }

    const ledgerClient = createSupabaseAdminClient();
    const now = new Date().toISOString();

    const { data: invoice, error: fetchError } = await supabase
      .from("payout_invoices")
      .select("id, status, invoice_number, requested_by")
      .eq("id", invoiceId)
      .eq("organization_id", organizationId)
      .single();

    if (fetchError || !invoice) {
      return { success: false, error: "Invoice tidak ditemukan." };
    }

    if (invoice.status !== "pending_approval") {
      return { success: false, error: "Invoice tidak dalam status pending_approval." };
    }

    // Unlink items
    await ledgerClient
      .from("payment_ledger_entries")
      .update({
        settlement_status: null,
        payout_invoice_id: null,
        updated_at: now,
      })
      .eq("payout_invoice_id", invoiceId);

    await ledgerClient
      .from("transactions")
      .update({
        payout_status: null,
        payout_invoice_id: null,
        updated_at: now,
      })
      .eq("payout_invoice_id", invoiceId);

    // Update invoice status
    const { error: updateError } = await supabase
      .from("payout_invoices")
      .update({
        status: "rejected",
        reviewed_by: user.id,
        reviewed_at: now,
        rejection_reason: reason.trim() || "Ditolak oleh admin/owner organisasi.",
        updated_at: now,
      })
      .eq("id", invoiceId);

    if (updateError) {
      return { success: false, error: "Gagal menolak invoice." };
    }

    revalidatePath("/invoices");

    if (invoice.requested_by) {
      await notifySafely(ledgerClient, {
        audience: "user",
        recipientProfileId: invoice.requested_by,
        organizationId,
        type: "payout.rejected_internal",
        title: "Draf Pencairan Ditolak",
        body: `Draf pencairan ${invoice.invoice_number} ditolak. Alasan: ${reason}`,
        href: "/invoices",
      });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menolak payout.",
    };
  }
}

export async function cancelInternalPayoutRequest(
  invoiceId: string,
): Promise<PayoutActionState> {
  try {
    const { supabase, user, organizationId } = await getOrganizationContext({
      requireManager: true,
    });
    
    const ledgerClient = createSupabaseAdminClient();
    const now = new Date().toISOString();

    const { data: invoice, error: fetchError } = await supabase
      .from("payout_invoices")
      .select("id, status, requested_by")
      .eq("id", invoiceId)
      .eq("organization_id", organizationId)
      .single();

    if (fetchError || !invoice) {
      return { success: false, error: "Invoice tidak ditemukan." };
    }

    if (invoice.status !== "pending_approval") {
      return { success: false, error: "Invoice tidak dalam status pending_approval atau sudah tidak bisa dibatalkan." };
    }

    if (invoice.requested_by !== user.id) {
      return { success: false, error: "Hanya pembuat yang dapat membatalkan draf ini." };
    }

    // Unlink items
    await ledgerClient
      .from("payment_ledger_entries")
      .update({
        settlement_status: null,
        payout_invoice_id: null,
        updated_at: now,
      })
      .eq("payout_invoice_id", invoiceId);

    await ledgerClient
      .from("transactions")
      .update({
        payout_status: null,
        payout_invoice_id: null,
        updated_at: now,
      })
      .eq("payout_invoice_id", invoiceId);

    // Update invoice status
    const { error: updateError } = await supabase
      .from("payout_invoices")
      .update({
        status: "canceled",
        updated_at: now,
      })
      .eq("id", invoiceId);

    if (updateError) {
      return { success: false, error: "Gagal membatalkan draf invoice." };
    }

    revalidatePath("/invoices");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal membatalkan draf payout.",
    };
  }
}
