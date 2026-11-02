"use server";

import { createHmac, randomInt, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  getAdminContext,
  requireSuperAdmin as requireSuperAdminContext,
} from "@/server/admin/context";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createAdminNotification } from "@/server/admin/notifications";
import { sendPayoutAccountOtpEmail } from "@/server/admin/payout-account-otp-email";
import {
  normalizeGatewayFeeSettings,
} from "@/lib/payment-gateway-fee";
import {
  getJakartaDayStart,
  parseJakartaDateTimeInput,
} from "@/lib/jakarta-time";
import type {
  PayoutAccount,
  PayoutActionState,
  PayoutPendingSettlementEntry,
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
import type { PaginatedResult, PaginationInput } from "@/types/pagination";

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
  gateway_settlement_date: string | null;
  created_at: string;
  verified_response: Record<string, unknown> | null;
};

type ActivePayoutAllocationRow = {
  ledger_entry_id: string | null;
  gross_amount: number;
  gateway_fee_amount: number;
  platform_fee_amount: number;
  net_amount: number;
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

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

type PayoutAccountOtpResult = PayoutActionState & {
  challengeId?: string;
  maskedEmail?: string;
  retryAfterSeconds?: number;
};

type ConfirmPayoutAccountOtpResult = PayoutActionState & {
  requiresNewCode?: boolean;
};

function payoutOtpHmac(value: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) throw new Error("Payout account verification is unavailable.");
  return createHmac("sha256", secret).update(value).digest("hex");
}

function normalizePayoutAccount(values: SavePayoutAccountInput) {
  return {
    bankName: values.bankName.trim(),
    accountNumber: values.accountNumber.trim(),
    accountHolderName: values.accountHolderName.trim(),
  };
}

function validatePayoutAccount(
  account: ReturnType<typeof normalizePayoutAccount>,
) {
  if (!account.bankName || !account.accountNumber || !account.accountHolderName) {
    return "Detail rekening payout wajib diisi.";
  }
  if (account.bankName.length > 120) return "Nama bank maksimal 120 karakter.";
  if (account.accountNumber.length > 64) return "Nomor rekening maksimal 64 karakter.";
  if (account.accountHolderName.length > 160) {
    return "Nama pemilik rekening maksimal 160 karakter.";
  }
  return null;
}

function payoutAccountPayloadHash(
  organizationId: string,
  requestedBy: string,
  values: ReturnType<typeof normalizePayoutAccount>,
) {
  return payoutOtpHmac(
    JSON.stringify([
      organizationId,
      requestedBy,
      values.bankName,
      values.accountNumber,
      values.accountHolderName,
    ]),
  );
}

function maskEmail(email: string) {
  const [localPart, domain] = email.trim().split("@");
  if (!localPart || !domain) return "your organization owner email";
  const visibleLocal = localPart.length > 2 ? localPart.slice(0, 2) : localPart.slice(0, 1);
  return `${visibleLocal}${"*".repeat(Math.max(3, localPart.length - visibleLocal.length))}@${domain}`;
}

async function getOrganizationOwnerEmail(
  organizationId: string,
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
) {
  const { data: ownerMembership, error: membershipError } = await adminClient
    .from("organization_members")
    .select("profile_id")
    .eq("organization_id", organizationId)
    .eq("role", "owner")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(`Unable to load organization owner: ${membershipError.message}`);
  }
  if (!ownerMembership?.profile_id) {
    throw new Error("Email pemilik organisasi tidak ditemukan.");
  }

  const { data, error } = await adminClient.auth.admin.getUserById(
    ownerMembership.profile_id,
  );
  if (error) throw new Error("Email pemilik organisasi tidak dapat diverifikasi.");
  if (!data.user?.email) {
    throw new Error("Email pemilik organisasi tidak ditemukan.");
  }

  return {
    profileId: ownerMembership.profile_id as string,
    email: data.user.email,
  };
}

function normalizePagination(input?: PaginationInput) {
  const page = Math.max(1, Math.floor(Number(input?.page ?? 1)));
  const requestedPageSize = Math.floor(
    Number(input?.pageSize ?? DEFAULT_PAGE_SIZE),
  );
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      Number.isFinite(requestedPageSize)
        ? requestedPageSize
        : DEFAULT_PAGE_SIZE,
    ),
  );
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return { page, pageSize, from, to };
}

function toPaginatedResult<T>(
  items: T[],
  pagination: ReturnType<typeof normalizePagination>,
  totalItems: number,
): PaginatedResult<T> {
  return {
    items,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pagination.pageSize)),
  };
}

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

  if (error) throw new Error(`Failed to load organization: ${error.message}`);
  if (!data?.organization_id) throw new Error("Organisasi tidak ditemukan.");

  const role = data.role as MembershipRole;
  if (options?.requireManager && !isManageableRole(role)) {
    throw new Error(
      "Hanya owner/admin/akuntan organisasi yang bisa mengajukan payout.",
    );
  }

  return {
    supabase,
    user,
    organizationId: data.organization_id as string,
    role,
  };
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
    throw new Error(`Failed to load payout settings: ${error.message}`);
  }

  const gatewayFeeSettings = normalizeGatewayFeeSettings({
    gatewayFeeType: data?.gateway_fee_type,
    gatewayFeePercentage: data?.gateway_fee_percentage,
    gatewayFeeFixedAmount: data?.gateway_fee_fixed_amount,
  });

  return {
    ...gatewayFeeSettings,
    platformFeeType: normalizeFeeType(data?.platform_fee_type),
    platformFeePercentage: Number(data?.platform_fee_percentage ?? 0),
    platformFeeFixedAmount: Number(data?.platform_fee_fixed_amount ?? 0),
    minimumPayoutAmount: Number(data?.minimum_payout_amount ?? 0),
  };
}

function calculateLine(row: EligibleLedgerEntryRow, settings: PayoutSettings) {
  void settings;
  const grossAmount = Number(row.gross_amount);
  // Historical entitlements use the fee snapshot recorded at payment time,
  // never today's mutable configuration.
  const gatewayFeeAmount = Number(row.gateway_fee_amount);
  const platformFeeAmount = 0;

  return {
    ledgerEntryId: row.id,
    transactionId: row.transaction_id,
    merchantOrderId: row.merchant_order_id,
    duitkuReference: row.duitku_reference,
    paymentGateway: row.provider,
    booth: row.booth,
    packageName: row.package_name,
    transactionPaidAt: row.paid_at ?? row.created_at,
    verifiedAt: row.verified_at,
    settlementDate: row.gateway_settlement_date,
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

function mapPendingSettlementEntry(
  line: ReturnType<typeof calculateLine>,
): PayoutPendingSettlementEntry {
  return {
    id: line.ledgerEntryId,
    transactionId: line.transactionId,
    merchantOrderId: line.merchantOrderId,
    duitkuReference: line.duitkuReference,
    booth: line.booth,
    packageName: line.packageName,
    paidAt: line.transactionPaidAt,
    verifiedAt: line.verifiedAt,
    settlementDate: line.settlementDate,
    grossAmount: line.grossAmount,
    gatewayFeeAmount: line.gatewayFeeAmount,
    platformFeeAmount: line.platformFeeAmount,
    netAmount: line.netAmount,
  };
}

async function loadActivePayoutAllocations(
  supabase: Awaited<ReturnType<typeof getAdminContext>>["supabase"],
  organizationId: string,
  ledgerEntryIds: string[],
) {
  if (!ledgerEntryIds.length) return [] as ActivePayoutAllocationRow[];

  const { data: invoices, error: invoiceError } = await supabase
    .from("payout_invoices")
    .select("id")
    .eq("organization_id", organizationId)
    .in("status", ["pending_approval", "requested", "approved", "paid"]);

  if (invoiceError) {
    if (invoiceError.code === "42P01" || invoiceError.code === "42703") {
      return [] as ActivePayoutAllocationRow[];
    }
    throw new Error(
      `Failed to load payout allocations: ${invoiceError.message}`,
    );
  }

  const invoiceIds = (invoices ?? []).map((invoice) => invoice.id as string);
  if (!invoiceIds.length) return [] as ActivePayoutAllocationRow[];

  const { data, error } = await supabase
    .from("payout_invoice_items")
    .select(
      "ledger_entry_id,gross_amount,gateway_fee_amount,platform_fee_amount,net_amount",
    )
    .in("payout_invoice_id", invoiceIds)
    .in("ledger_entry_id", ledgerEntryIds);

  if (error) {
    if (error.code === "42P01" || error.code === "42703") {
      return [] as ActivePayoutAllocationRow[];
    }
    throw new Error(`Failed to load payout allocations: ${error.message}`);
  }

  return (data ?? []) as ActivePayoutAllocationRow[];
}

async function loadAvailablePayoutLines(
  supabase: Awaited<ReturnType<typeof getAdminContext>>["supabase"],
  organizationId: string,
  settings: PayoutSettings,
) {
  const rows = await loadEligibleLedgerEntries(supabase, organizationId);
  const allocations = await loadActivePayoutAllocations(
    supabase,
    organizationId,
    rows.map((row) => row.id),
  );
  return mapAvailablePayoutLines(rows, allocations, settings);
}

function mapAvailablePayoutLines(
  rows: EligibleLedgerEntryRow[],
  allocations: ActivePayoutAllocationRow[],
  settings: PayoutSettings,
) {
  const allocatedByLedger = new Map<
    string,
    { grossAmount: number; gatewayFeeAmount: number; platformFeeAmount: number }
  >();

  for (const allocation of allocations) {
    if (!allocation.ledger_entry_id) continue;
    const current = allocatedByLedger.get(allocation.ledger_entry_id) ?? {
      grossAmount: 0,
      gatewayFeeAmount: 0,
      platformFeeAmount: 0,
    };
    current.grossAmount += Number(allocation.gross_amount);
    current.gatewayFeeAmount += Number(allocation.gateway_fee_amount);
    current.platformFeeAmount += Number(allocation.platform_fee_amount);
    allocatedByLedger.set(allocation.ledger_entry_id, current);
  }

  return rows.flatMap((row) => {
    const fullLine = calculateLine(row, settings);
    const allocated = allocatedByLedger.get(row.id) ?? {
      grossAmount: 0,
      gatewayFeeAmount: 0,
      platformFeeAmount: 0,
    };
    const remainingGrossAmount = Math.max(
      0,
      fullLine.grossAmount - allocated.grossAmount,
    );
    if (remainingGrossAmount <= 0) return [];

    return [
      {
        ...fullLine,
        grossAmount: remainingGrossAmount,
        gatewayFeeAmount: Math.max(
          0,
          fullLine.gatewayFeeAmount - allocated.gatewayFeeAmount,
        ),
        platformFeeAmount: Math.max(
          0,
          fullLine.platformFeeAmount - allocated.platformFeeAmount,
        ),
        netAmount: Math.max(
          0,
          remainingGrossAmount -
            (fullLine.gatewayFeeAmount - allocated.gatewayFeeAmount) -
            (fullLine.platformFeeAmount - allocated.platformFeeAmount),
        ),
      },
    ];
  });
}

function allocatePayoutLine(
  line: ReturnType<typeof calculateLine>,
  grossAmount: number,
) {
  const allocatedGrossAmount = Math.min(
    line.grossAmount,
    Math.max(0, Math.round(grossAmount)),
  );
  const ratio =
    line.grossAmount > 0 ? allocatedGrossAmount / line.grossAmount : 0;
  const gatewayFeeAmount = Math.min(
    line.gatewayFeeAmount,
    Math.max(0, Math.round(line.gatewayFeeAmount * ratio)),
  );
  const platformFeeAmount = Math.min(
    line.platformFeeAmount,
    Math.max(0, Math.round(line.platformFeeAmount * ratio)),
  );

  return {
    ...line,
    grossAmount: allocatedGrossAmount,
    gatewayFeeAmount,
    platformFeeAmount,
    netAmount: Math.max(
      0,
      allocatedGrossAmount - gatewayFeeAmount - platformFeeAmount,
    ),
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
    throw new Error(`Failed to load payout account: ${error.message}`);
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
        "id,transaction_id,provider,merchant_order_id,duitku_reference,gross_amount,gateway_fee_amount,platform_fee_amount,adjustment_amount,net_amount,booth,package_name,paid_at,verified_at,gateway_settlement_date,created_at,verified_response",
      )
      .eq("organization_id", organizationId)
      .eq("status", "paid")
      .eq("provider", "duitku")
      .eq("payment_method", "QRIS")
      .eq("collection_mode", "platform")
      .eq("gateway_settlement_status", "settled")
      .is("settlement_status", null)
      .is("payout_invoice_id", null)
      .order("paid_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      if (error.code === "42P01" || error.code === "42703") return [];
      throw new Error(
        `Failed to load eligible ledger entries: ${error.message}`,
      );
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

async function loadPendingSettlementLines(
  supabase: Awaited<ReturnType<typeof getAdminContext>>["supabase"],
  organizationId: string,
  settings: PayoutSettings,
) {
  const rows: EligibleLedgerEntryRow[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("payment_ledger_entries")
      .select(
        "id,transaction_id,provider,merchant_order_id,duitku_reference,gross_amount,gateway_fee_amount,platform_fee_amount,adjustment_amount,net_amount,booth,package_name,paid_at,verified_at,gateway_settlement_date,created_at,verified_response",
      )
      .eq("organization_id", organizationId)
      .eq("status", "paid")
      .eq("provider", "duitku")
      .eq("payment_method", "QRIS")
      .eq("collection_mode", "platform")
      .eq("gateway_settlement_status", "pending")
      .is("settlement_status", null)
      .is("payout_invoice_id", null)
      .order("gateway_settlement_date", {
        ascending: true,
        nullsFirst: false,
      })
      .range(from, from + pageSize - 1);

    if (error) {
      if (error.code === "42P01" || error.code === "42703") {
        return {
          lines: [] as ReturnType<typeof calculateLine>[],
          nextEstimatedSettlementDate: null,
        };
      }
      throw new Error(
        `Failed to load pending settlement entries: ${error.message}`,
      );
    }

    rows.push(
      ...((data ?? []) as EligibleLedgerEntryRow[]).filter(
        isVerifiedDuitkuLedgerEntry,
      ),
    );
    if (!data || data.length < pageSize) break;
  }

  const allocations = await loadActivePayoutAllocations(
    supabase,
    organizationId,
    rows.map((row) => row.id),
  );
  const allocatedLedgerIds = new Set(
    allocations
      .map((allocation) => allocation.ledger_entry_id)
      .filter((ledgerEntryId): ledgerEntryId is string => Boolean(ledgerEntryId)),
  );
  const unallocatedRows = rows.filter((row) => !allocatedLedgerIds.has(row.id));
  const lines = unallocatedRows.map((row) => calculateLine(row, settings));

  return {
    lines,
    nextEstimatedSettlementDate:
      lines.find((line) => line.settlementDate)?.settlementDate ?? null,
  };
}

async function loadPayoutSummaryTotals(
  supabase: Awaited<ReturnType<typeof getAdminContext>>["supabase"],
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("payout_invoices")
    .select("status,net_amount")
    .eq("organization_id", organizationId)
    .limit(5000);

  if (error) {
    if (error.code === "42P01" || error.code === "42703") return [];
    throw new Error(`Failed to load payout totals: ${error.message}`);
  }

  return (data ?? []) as Array<{
    status: PayoutStatus;
    net_amount: number;
  }>;
}

function loadInvoices(
  supabase: Awaited<ReturnType<typeof getAdminContext>>["supabase"],
  filters?: PayoutInvoiceFilters & { organizationId?: string },
): Promise<PayoutInvoice[]>;
function loadInvoices(
  supabase: Awaited<ReturnType<typeof getAdminContext>>["supabase"],
  filters: PayoutInvoiceFilters & { organizationId?: string },
  paginationInput: PaginationInput,
): Promise<PaginatedResult<PayoutInvoice>>;
async function loadInvoices(
  supabase: Awaited<ReturnType<typeof getAdminContext>>["supabase"],
  filters: PayoutInvoiceFilters & { organizationId?: string } = {},
  paginationInput?: PaginationInput,
) {
  const pagination = paginationInput
    ? normalizePagination(paginationInput)
    : null;
  let query = supabase
    .from("payout_invoices")
    .select(
      "id,invoice_number,organization_id,organizations(name),status,gross_amount,gateway_fee_amount,platform_fee_amount,adjustment_amount,net_amount,requested_amount,requested_at,reviewed_at,paid_at,payment_reference,payment_proof_url,payment_proof_key,payment_proof_uploaded_at,notes,review_notes,rejection_reason,account_snapshot,fee_snapshot",
      pagination ? { count: "exact" } : undefined,
    )
    .order("requested_at", { ascending: false });

  if (filters.organizationId) {
    query = query.eq("organization_id", filters.organizationId);
  }
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.dateFrom) {
    const start = getJakartaDayStart(filters.dateFrom);
    if (start && !Number.isNaN(start.getTime())) {
      query = query.gte("requested_at", start.toISOString());
    }
  }
  if (filters.dateTo) {
    const end = getJakartaDayStart(filters.dateTo);
    if (end && !Number.isNaN(end.getTime())) {
      end.setUTCDate(end.getUTCDate() + 1);
      query = query.lt("requested_at", end.toISOString());
    }
  }

  const { data, error, count } = pagination
    ? await query.range(pagination.from, pagination.to)
    : await query.limit(500);
  if (error) {
    if (error.code === "42P01" || error.code === "42703") {
      return pagination ? toPaginatedResult([], pagination, 0) : [];
    }
    throw new Error(`Failed to load payouts: ${error.message}`);
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
      throw new Error(`Failed to load payout items: ${itemError.message}`);
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

  const invoices = rows.map((row) => mapPayoutInvoice(row, itemsByInvoice));
  if (!pagination) return invoices;

  return toPaginatedResult(invoices, pagination, count ?? invoices.length);
}

export async function getMyPayoutSummary() {
  const { supabase, organizationId } = await getOrganizationContext();
  const settingsPromise = getPayoutSettings(supabase);
  const [
    settings,
    payoutAccount,
    availableLines,
    pendingSettlement,
    invoiceTotals,
  ] = await Promise.all([
    settingsPromise,
    getDefaultPayoutAccount(supabase, organizationId),
    settingsPromise.then((loadedSettings) =>
      loadAvailablePayoutLines(supabase, organizationId, loadedSettings),
    ),
    settingsPromise.then((loadedSettings) =>
      loadPendingSettlementLines(supabase, organizationId, loadedSettings),
    ),
    loadPayoutSummaryTotals(supabase, organizationId),
  ]);

  const available = sumLines(availableLines);
  const pendingSettlementTotals = sumLines(pendingSettlement.lines);
  const pendingNetAmount = invoiceTotals
    .filter((invoice) => ["requested", "approved"].includes(invoice.status))
    .reduce((sum, invoice) => sum + Number(invoice.net_amount), 0);
  const paidNetAmount = invoiceTotals
    .filter((invoice) => invoice.status === "paid")
    .reduce((sum, invoice) => sum + Number(invoice.net_amount), 0);

  return {
    availableGrossAmount: available.grossAmount,
    availableGatewayFeeAmount: available.gatewayFeeAmount,
    availablePlatformFeeAmount: available.platformFeeAmount,
    availableNetAmount: available.netAmount,
    pendingSettlementGrossAmount: pendingSettlementTotals.grossAmount,
    pendingSettlementNetAmount: pendingSettlementTotals.netAmount,
    pendingSettlementTransactionCount: pendingSettlement.lines.length,
    nextEstimatedSettlementDate: pendingSettlement.nextEstimatedSettlementDate,
    pendingNetAmount,
    paidNetAmount,
    eligibleTransactionCount: availableLines.length,
    pendingInvoiceCount: invoiceTotals.filter((invoice) =>
      ["requested", "approved"].includes(invoice.status),
    ).length,
    settings,
    payoutAccount,
  };
}

export async function getMyPayoutInvoices(
  pagination?: PaginationInput,
): Promise<PaginatedResult<PayoutInvoice>> {
  const { supabase, organizationId } = await getOrganizationContext();
  return loadInvoices(supabase, { organizationId }, pagination ?? {});
}

export async function getMyPendingSettlementEntries(
  paginationInput?: PaginationInput,
): Promise<PaginatedResult<PayoutPendingSettlementEntry>> {
  const { supabase, organizationId } = await getOrganizationContext();
  const settings = await getPayoutSettings(supabase);
  const pagination = normalizePagination(
    paginationInput ?? { page: 1, pageSize: 20 },
  );
  const pendingSettlement = await loadPendingSettlementLines(
    supabase,
    organizationId,
    settings,
  );
  const lines = pendingSettlement.lines.slice(
    pagination.from,
    pagination.to + 1,
  );

  return toPaginatedResult(
    lines.map((line) => mapPendingSettlementEntry(line)),
    pagination,
    pendingSettlement.lines.length,
  );
}

export async function requestPayoutAccountChangeOtp(
  values: SavePayoutAccountInput,
): Promise<PayoutAccountOtpResult> {
  try {
    const { user, organizationId, role } = await getOrganizationContext({
      requireManager: true,
    });

    if (role !== "owner" && role !== "admin") {
      return {
        success: false,
        error: "Hanya owner atau admin yang dapat mengubah rekening payout.",
      };
    }

    const account = normalizePayoutAccount(values);
    const accountError = validatePayoutAccount(account);
    if (accountError) return { success: false, error: accountError };

    const adminClient = createSupabaseAdminClient();
    const owner = await getOrganizationOwnerEmail(organizationId, adminClient);
    const { data: slotResult, error: slotError } = await adminClient.rpc(
      "take_payout_account_change_otp_slot",
      {
        p_organization_id: organizationId,
        p_requested_by: user.id,
      },
    );
    if (slotError) {
      throw new Error("OTP belum dapat dikirim. Silakan coba lagi nanti.");
    }
    const slot = slotResult as {
      allowed?: boolean;
      retry_after_seconds?: number;
    } | null;
    if (slot?.allowed !== true) {
      const retryAfterSeconds = Math.max(1, Number(slot?.retry_after_seconds ?? 60));
      const { data: pendingChallenge } = await adminClient
        .from("payout_account_change_otps")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("requested_by", user.id)
        .is("consumed_at", null)
        .maybeSingle();
      return {
        success: false,
        error: `Tunggu ${retryAfterSeconds} detik sebelum meminta OTP baru.`,
        challengeId: pendingChallenge?.id,
        maskedEmail: maskEmail(owner.email),
        retryAfterSeconds,
      };
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const challengeId = randomUUID();
    const payloadHash = payoutAccountPayloadHash(organizationId, user.id, account);
    const codeHash = payoutOtpHmac(`${challengeId}:${code}`);
    const { data: issueResult, error: issueError } = await adminClient.rpc(
      "issue_payout_account_change_otp",
      {
        p_challenge_id: challengeId,
        p_organization_id: organizationId,
        p_requested_by: user.id,
        p_owner_profile_id: owner.profileId,
        p_code_hash: codeHash,
        p_payload_hash: payloadHash,
      },
    );
    if (issueError) {
      throw new Error("OTP belum dapat dibuat. Silakan coba lagi.");
    }

    const issue = issueResult as {
      sent?: boolean;
      challenge_id?: string;
      retry_after_seconds?: number;
    } | null;
    if (issue?.sent !== true || !issue.challenge_id) {
      const retryAfterSeconds = Math.max(1, Number(issue?.retry_after_seconds ?? 60));
      return {
        success: false,
        error: `Tunggu ${retryAfterSeconds} detik sebelum meminta OTP baru.`,
        challengeId: issue?.challenge_id,
        maskedEmail: maskEmail(owner.email),
        retryAfterSeconds,
      };
    }

    const { data: organization } = await adminClient
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .maybeSingle();

    try {
      await sendPayoutAccountOtpEmail({
        email: owner.email,
        organizationName: organization?.name ?? "POSKART organization",
        code,
        bankName: account.bankName,
        accountHolderName: account.accountHolderName,
        accountNumberLastFour: account.accountNumber.replace(/\s/g, "").slice(-4),
      });
    } catch (emailError) {
      await adminClient
        .from("payout_account_change_otps")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", issue.challenge_id)
        .eq("organization_id", organizationId)
        .eq("requested_by", user.id);
      return {
        success: false,
        error:
          emailError instanceof Error
            ? emailError.message
            : "OTP gagal dikirim ke email owner. Silakan coba lagi.",
      };
    }

    return {
      success: true,
      challengeId: issue.challenge_id,
      maskedEmail: maskEmail(owner.email),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "OTP gagal dikirim ke email owner.",
    };
  }
}

export async function cancelPayoutAccountChangeOtp(
  challengeId: string,
): Promise<PayoutActionState> {
  try {
    const { user, organizationId, role } = await getOrganizationContext({
      requireManager: true,
    });
    if (role !== "owner" && role !== "admin") {
      return { success: false, error: "Tidak memiliki izin untuk membatalkan verifikasi." };
    }
    if (!/^[0-9a-f-]{36}$/i.test(challengeId)) {
      return { success: false, error: "Sesi verifikasi tidak valid." };
    }

    const adminClient = createSupabaseAdminClient();
    const { error } = await adminClient
      .from("payout_account_change_otps")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", challengeId)
      .eq("organization_id", organizationId)
      .eq("requested_by", user.id)
      .is("consumed_at", null);
    if (error) throw new Error("Sesi OTP tidak dapat dibatalkan.");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Sesi OTP tidak dapat dibatalkan.",
    };
  }
}

export async function confirmPayoutAccountChangeOtp(input: {
  challengeId: string;
  code: string;
  account: SavePayoutAccountInput;
}): Promise<ConfirmPayoutAccountOtpResult> {
  try {
    const { user, organizationId, role } = await getOrganizationContext({
      requireManager: true,
    });
    if (role !== "owner" && role !== "admin") {
      return {
        success: false,
        error: "Hanya owner atau admin yang dapat mengubah rekening payout.",
      };
    }

    if (!/^[0-9a-f-]{36}$/i.test(input.challengeId)) {
      return { success: false, error: "Sesi verifikasi tidak valid. Minta OTP baru." };
    }
    const code = input.code.trim();
    if (!/^\d{6}$/.test(code)) {
      return { success: false, error: "Masukkan kode OTP 6 digit." };
    }

    const account = normalizePayoutAccount(input.account);
    const accountError = validatePayoutAccount(account);
    if (accountError) return { success: false, error: accountError };

    const adminClient = createSupabaseAdminClient();
    const owner = await getOrganizationOwnerEmail(organizationId, adminClient);
    const { data, error } = await adminClient.rpc(
      "verify_and_save_payout_account_change",
      {
        p_challenge_id: input.challengeId,
        p_organization_id: organizationId,
        p_requested_by: user.id,
        p_owner_profile_id: owner.profileId,
        p_code_hash: payoutOtpHmac(`${input.challengeId}:${code}`),
        p_payload_hash: payoutAccountPayloadHash(organizationId, user.id, account),
        p_bank_name: account.bankName,
        p_account_number: account.accountNumber,
        p_account_holder_name: account.accountHolderName,
      },
    );

    if (error) {
      throw new Error("Verifikasi OTP gagal. Silakan minta kode baru.");
    }

    switch (data) {
      case "saved":
        revalidatePath("/withdraw");
        revalidatePath("/settings");
        return { success: true };
      case "invalid_code":
        return { success: false, error: "Kode OTP salah. Periksa email owner lalu coba lagi." };
      case "too_many_attempts":
        return { success: false, error: "Batas percobaan tercapai. Minta OTP baru.", requiresNewCode: true };
      case "expired":
        return { success: false, error: "Kode OTP sudah kedaluwarsa. Minta kode baru.", requiresNewCode: true };
      case "details_changed":
        return { success: false, error: "Detail rekening berubah. Minta OTP baru untuk detail ini.", requiresNewCode: true };
      case "owner_changed":
        return { success: false, error: "Pemilik organisasi berubah. Minta OTP baru.", requiresNewCode: true };
      case "unauthorized":
        return { success: false, error: "Akses pengubahan rekening payout sudah dicabut.", requiresNewCode: true };
      case "invalid_details":
        return { success: false, error: "Detail rekening payout tidak valid." };
      default:
        return { success: false, error: "OTP tidak valid atau sudah digunakan. Minta kode baru.", requiresNewCode: true };
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Rekening payout tidak dapat disimpan.",
    };
  }
}

export async function requestPayout(
  values: RequestPayoutInput,
): Promise<PayoutActionState> {
  try {
    const { supabase, user, organizationId, role } =
      await getOrganizationContext({
        requireManager: true,
      });
    const isAccountant = role === "akuntan";
    const initialStatus = isAccountant ? "pending_approval" : "requested";
    const ledgerClient = createSupabaseAdminClient();
    if (!/^[0-9a-f-]{36}$/i.test(values.requestId ?? "")) {
      return { success: false, error: "Invalid withdrawal request key. Reopen the request dialog." };
    }
    // A response can be lost after a successful commit. Do not allocate twice.
    const { data: prior, error: priorError } = await ledgerClient.from("payout_invoices")
      .select("id,requested_amount,payout_account_id,requested_by")
      .eq("organization_id", organizationId).eq("request_key", values.requestId).maybeSingle();
    if (priorError) throw priorError;
    if (prior) {
      if (prior.requested_by !== user.id || prior.requested_amount !== Math.round(Number(values.amount)) || prior.payout_account_id !== values.accountId) {
        return { success: false, error: "Withdrawal request key was already used for different details." };
      }
      return { success: true };
    }
    const requestedAmount = Math.round(Number(values.amount));
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return { success: false, error: "Invalid withdrawal amount." };
    }

    const [settings, account] = await Promise.all([
      getPayoutSettings(supabase),
      getDefaultPayoutAccount(supabase, organizationId),
    ]);
    const availableLines = await loadAvailablePayoutLines(
      ledgerClient,
      organizationId,
      settings,
    );

    if (!account || account.id !== values.accountId) {
      return { success: false, error: "Invalid payout account." };
    }
    if (
      settings.minimumPayoutAmount > 0 &&
      requestedAmount < settings.minimumPayoutAmount
    ) {
      return {
        success: false,
        error: `Minimum withdrawal amount is Rp ${settings.minimumPayoutAmount.toLocaleString("id-ID")}.`,
      };
    }

    const availableGrossAmount = sumLines(availableLines).grossAmount;
    if (requestedAmount > availableGrossAmount) {
      return {
        success: false,
        error: `Withdrawal amount cannot exceed available gross of Rp ${availableGrossAmount.toLocaleString("id-ID")}.`,
      };
    }

    const selectedLines: ReturnType<typeof calculateLine>[] = [];
    let remainingGrossAmount = requestedAmount;

    for (const line of availableLines) {
      if (line.netAmount <= 0) continue;
      const allocatedLine = allocatePayoutLine(line, remainingGrossAmount);
      if (allocatedLine.grossAmount <= 0) break;
      selectedLines.push(allocatedLine);
      remainingGrossAmount -= allocatedLine.grossAmount;
      if (remainingGrossAmount <= 0) break;
    }

    if (selectedLines.length === 0 || remainingGrossAmount > 0) {
      return {
        success: false,
        error:
          "The requested amount is no longer available. Refresh and try again.",
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

    const { data: invoiceId, error: invoiceError } = await ledgerClient.rpc("create_reserved_payout", {
      p_invoice: {
        request_key: values.requestId,
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
      },
      p_items: selectedLines.map((line) => ({
        ledger_entry_id: line.ledgerEntryId,
        transaction_id: line.transactionId,
        payment_gateway: line.paymentGateway,
        booth: line.booth, package_name: line.packageName,
        transaction_paid_at: line.transactionPaidAt,
        gross_amount: line.grossAmount,
        gateway_fee_amount: line.gatewayFeeAmount,
        platform_fee_amount: line.platformFeeAmount, net_amount: line.netAmount,
      })),
    });

    if (invoiceError || !invoiceId) {
      return {
        success: false,
        error: `Failed to create payout: ${invoiceError?.message ?? "empty payout"}`,
      };
    }

    const invoice = { id: invoiceId as string };

    revalidatePath("/withdraw");
    revalidatePath("/superadmin");
    if (isAccountant) {
      await notifySafely(ledgerClient, {
        audience: "organization",
        type: "payout.needs_approval",
        title: "Withdrawal approval needed",
        body: `An accountant submitted a withdrawal draft for Rp ${invoiceNetAmount.toLocaleString("id-ID")}. Please review it.`,
        href: "/withdraw",
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
        title: "New withdrawal request",
        body: `${invoiceNumber} is waiting for POSKART review.`,
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
      error:
        error instanceof Error ? error.message : "Failed to request payout.",
    };
  }
}

export async function getPayoutInvoicesForSuperadmin(
  filters: PayoutInvoiceFilters = {},
  pagination?: PaginationInput,
): Promise<PaginatedResult<PayoutInvoice>> {
  const { supabase } = await requireSuperAdmin();
  return loadInvoices(supabase, filters, pagination ?? {});
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
    revalidatePath("/withdraw");
    revalidatePath("/transactions");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to save payout settings.",
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
    if (!invoice) return { success: false, error: "Payout not found." };
    if (!["requested", "approved"].includes(invoice.status as string)) {
      return { success: false, error: "This payout cannot be approved." };
    }

    const now = new Date().toISOString();

    const { data: changed, error } = await ledgerClient
      .from("payout_invoices")
      .update({
        status: "approved",
        review_notes: reviewPatch.reviewNotes?.trim() || null,
        reviewed_by: user.id,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", id)
      .in("status", ["requested", "approved"])
      .select("id").maybeSingle();

    if (error) return { success: false, error: error.message };
    if (!changed) return { success: false, error: "Payout status changed. Refresh and try again." };

    revalidatePath("/withdraw");
    revalidatePath("/superadmin");
    await notifySafely(ledgerClient, {
      audience: "organization",
      organizationId: invoice.organization_id as string,
      type: "payout.approved",
      title: "Withdrawal approved",
      body: `${invoice.invoice_number} has been approved and is waiting for transfer.`,
      href: "/withdraw",
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
      error:
        error instanceof Error ? error.message : "Failed to approve payout.",
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
    if (!invoice) return { success: false, error: "Payout not found." };

    const { data: changed, error } = await ledgerClient
      .from("payout_invoices")
      .update({
        status: "rejected",
        rejection_reason: reason.trim() || "Rejected by superadmin",
        reviewed_by: user.id,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", id)
      .eq("status", "requested")
      .select("id").maybeSingle();

    if (error) return { success: false, error: error.message };
    if (!changed) return { success: false, error: "Only a requested payout can be rejected. Approved transfers remain reserved." };

    revalidatePath("/withdraw");
    revalidatePath("/superadmin");
    await notifySafely(ledgerClient, {
      audience: "organization",
      organizationId: invoice.organization_id as string,
      type: "payout.rejected",
      title: "Withdrawal rejected",
      body: `${invoice.invoice_number} was rejected. The balance has been returned to eligible payouts.`,
      href: "/withdraw",
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
      error:
        error instanceof Error ? error.message : "Failed to reject payout.",
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
      return { success: false, error: "Transfer reference is required." };
    }
    if (!proofUrl || !proofKey) {
      return { success: false, error: "Transfer proof is required." };
    }

    const parsedPaidAt = paidAt
      ? parseJakartaDateTimeInput(paidAt)
      : null;
    if (paidAt && Number.isNaN(parsedPaidAt?.getTime())) {
      return { success: false, error: "Invalid transfer date." };
    }
    const paidAtValue = parsedPaidAt ? parsedPaidAt.toISOString() : now;

    const { data: invoice, error: invoiceError } = await supabase
      .from("payout_invoices")
      .select("id,invoice_number,organization_id,net_amount")
      .eq("id", id)
      .maybeSingle();

    if (invoiceError) throw invoiceError;
    if (!invoice) return { success: false, error: "Payout not found." };

    const { data: updatedInvoice, error } = await ledgerClient
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
        error: "This payout is not in a status that can be marked as paid.",
      };
    }

    revalidatePath("/withdraw");
    revalidatePath("/superadmin");
    await notifySafely(ledgerClient, {
      audience: "organization",
      organizationId: invoice.organization_id as string,
      type: "payout.paid",
      title: "Withdrawal transferred",
      body: `${invoice.invoice_number} has been marked as paid.`,
      href: "/withdraw",
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
      error:
        error instanceof Error
          ? error.message
          : "Failed to mark payout as paid.",
    };
  }
}

export async function approveInternalPayoutRequest(
  invoiceId: string,
): Promise<PayoutActionState> {
  try {
    const { supabase, user, organizationId, role } =
      await getOrganizationContext({
        requireManager: true,
      });

    if (role === "akuntan") {
      return {
        success: false,
        error: "Only owners or admins can approve withdrawals.",
      };
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
      return { success: false, error: "Payout not found." };
    }

    if (invoice.status !== "pending_approval") {
      return { success: false, error: "This payout is not pending approval." };
    }

    // Update the invoice status
    const { data: changed, error: updateError } = await ledgerClient
      .from("payout_invoices")
      .update({
        status: "requested",
        reviewed_by: user.id,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", invoiceId).eq("organization_id", organizationId)
      .eq("status", "pending_approval").select("id").maybeSingle();

    if (updateError || !changed) {
      return { success: false, error: "Failed to approve payout." };
    }

    revalidatePath("/withdraw");
    revalidatePath("/superadmin");

    // Notify superadmin
    await notifySafely(ledgerClient, {
      audience: "superadmin",
      type: "payout.requested",
      title: "Withdrawal request internally approved",
      body: `${invoice.invoice_number} was approved by the owner/admin and is waiting for POSKART review.`,
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
        title: "Withdrawal draft approved",
        body: `Withdrawal draft ${invoice.invoice_number} has been approved and forwarded to the platform.`,
        href: "/withdraw",
      });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to approve payout.",
    };
  }
}

export async function rejectInternalPayoutRequest(
  invoiceId: string,
  reason: string,
): Promise<PayoutActionState> {
  try {
    const { supabase, user, organizationId, role } =
      await getOrganizationContext({
        requireManager: true,
      });

    if (role === "akuntan") {
      return {
        success: false,
        error: "Only owners or admins can reject withdrawals.",
      };
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
      return { success: false, error: "Payout not found." };
    }

    if (invoice.status !== "pending_approval") {
      return { success: false, error: "This payout is not pending approval." };
    }

    // Update invoice status
    const { data: changed, error: updateError } = await ledgerClient
      .from("payout_invoices")
      .update({
        status: "rejected",
        reviewed_by: user.id,
        reviewed_at: now,
        rejection_reason:
          reason.trim() || "Rejected by the organization admin/owner.",
        updated_at: now,
      })
      .eq("id", invoiceId).eq("organization_id", organizationId)
      .eq("status", "pending_approval").select("id").maybeSingle();

    if (updateError || !changed) {
      return { success: false, error: "Failed to reject payout." };
    }

    revalidatePath("/withdraw");

    if (invoice.requested_by) {
      await notifySafely(ledgerClient, {
        audience: "user",
        recipientProfileId: invoice.requested_by,
        organizationId,
        type: "payout.rejected_internal",
        title: "Withdrawal draft rejected",
        body: `Withdrawal draft ${invoice.invoice_number} was rejected. Reason: ${reason}`,
        href: "/withdraw",
      });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to reject payout.",
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
      return { success: false, error: "Payout not found." };
    }

    if (invoice.status !== "pending_approval") {
      return {
        success: false,
        error:
          "This payout is not pending approval or can no longer be canceled.",
      };
    }

    if (invoice.requested_by !== user.id) {
      return {
        success: false,
        error: "Only the creator can cancel this draft.",
      };
    }

    // Update invoice status
    const { data: changed, error: updateError } = await ledgerClient
      .from("payout_invoices")
      .update({
        status: "canceled",
        updated_at: now,
      })
      .eq("id", invoiceId).eq("organization_id", organizationId)
      .eq("requested_by", user.id).eq("status", "pending_approval").select("id").maybeSingle();

    if (updateError || !changed) {
      return { success: false, error: "Failed to cancel payout draft." };
    }

    revalidatePath("/withdraw");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to cancel payout draft.",
    };
  }
}
