"use server";

import { getAdminContext, verifyRole } from "@/server/admin/context";
import { isSuperAdminProfile } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createAdminNotification } from "@/server/admin/notifications";
import {
  assertSupabaseResult,
  mapTransaction,
  TRANSACTION_COLUMNS,
  type Transaction,
  type TransactionRow,
  type RetryPrintTransactionRow,
} from "../_shared/admin-types";
import type {
  TransactionActionRequest,
  TransactionActionStatus,
  TransactionActionType,
  TransactionPendingAction,
} from "@/types/transaction";
import type { PaginatedResult, PaginationInput } from "@/types/pagination";

type TransactionActionRequestRow = {
  id: string;
  transaction_id: string;
  organization_id: string;
  organizations?: { name: string | null } | { name: string | null }[] | null;
  action: TransactionActionType;
  status: TransactionActionStatus;
  reason: string | null;
  requested_by: string | null;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  profiles?: { email: string | null } | { email: string | null }[] | null;
  transactions?:
    | {
        id: string;
        booth: string | null;
        package_name: string | null;
        amount: number | null;
        status: Transaction["status"] | null;
        provider: Transaction["provider"] | null;
        created_at: string | null;
      }
    | Array<{
        id: string;
        booth: string | null;
        package_name: string | null;
        amount: number | null;
        status: Transaction["status"] | null;
        provider: Transaction["provider"] | null;
        created_at: string | null;
      }>
    | null;
};

type TransactionForActionRow = {
  id: string;
  organization_id: string;
  booth: string | null;
  location: string | null;
  customer: string | null;
  package_name: string | null;
  amount: number | null;
  status: Transaction["status"] | null;
  provider: Transaction["provider"] | null;
  created_at: string | null;
  paid_at?: string | null;
  archived_at?: string | null;
  archive_reason?: string | null;
  payout_status?: string | null;
  payout_invoice_id?: string | null;
};

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export type TransactionListFilters = PaginationInput & {
  search?: string;
  status?: string;
  paymentMethod?: string;
  packageName?: string;
  date?: string;
  fromDate?: string;
  toDate?: string;
  booth?: string;
};

export type TransactionPageSummary = {
  transactionCount: number;
  paidCount: number;
  printCount: number;
  grossRevenue: number;
  qrisGrossRevenue: number;
  qrisPaidCount: number;
};

export type TransactionPageResult = PaginatedResult<Transaction> & {
  summary: TransactionPageSummary;
};

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

async function attachPendingActions(
  supabase: Awaited<ReturnType<typeof getAdminContext>>["supabase"],
  transactions: Transaction[],
) {
  const ids = transactions.map((transaction) => transaction.id);
  if (ids.length === 0) return transactions;

  const { data: requests, error: requestError } = await supabase
    .from("transaction_action_requests")
    .select("id,transaction_id,action,status,requested_at")
    .eq("status", "requested")
    .in("transaction_id", ids);

  if (requestError) {
    if (requestError.code === "42P01" || requestError.code === "42703") {
      return transactions;
    }
    throw new Error(
      `Unable to load transaction action requests: ${requestError.message}`,
    );
  }

  const pendingByTransaction = new Map<string, TransactionPendingAction>();
  for (const request of (requests ?? []) as Array<{
    id: string;
    transaction_id: string;
    action: TransactionActionType;
    status: TransactionActionStatus;
    requested_at: string;
  }>) {
    pendingByTransaction.set(request.transaction_id, {
      id: request.id,
      action: request.action,
      status: request.status,
      requestedAt: request.requested_at,
    });
  }

  return transactions.map((transaction) => ({
    ...transaction,
    pendingAction: pendingByTransaction.get(transaction.id) ?? null,
  }));
}

/**
 * Server-side transaction list. The legacy getTransactions function remains
 * for dashboard aggregates, while the monitoring table uses this bounded query.
 */
export async function getTransactionsPage(
  filters: TransactionListFilters = {},
): Promise<TransactionPageResult> {
  const { supabase } = await getAdminContext();
  const pagination = normalizePagination(filters);
  const requestedStatus = filters.status?.trim() || "all";
  const status = new Set([
    "all",
    "paid",
    "pending",
    "failed",
    "refunded",
    "cancelled",
    "archive",
    "testing",
  ]).has(requestedStatus)
    ? requestedStatus
    : "all";
  const requestedPaymentMethod = filters.paymentMethod?.trim() || "all";
  const paymentMethod = new Set([
    "all",
    "QRIS",
    "Cash",
    "Voucher",
    "Event",
  ]).has(requestedPaymentMethod)
    ? requestedPaymentMethod
    : "all";
  const packageName = filters.packageName?.trim();
  const booth = filters.booth?.trim();
  const search = filters.search?.trim();

  let visibilityFilter: string;
  if (status === "archive") {
    visibilityFilter =
      "and(archived_at.not.is.null,archive_reason.neq.testing)";
  } else if (status === "testing") {
    visibilityFilter = "or(archive_reason.eq.testing,payout_status.eq.testing)";
  } else {
    visibilityFilter =
      status === "all"
        ? "and(archived_at.is.null,archive_reason.is.null)"
        : `and(archived_at.is.null,archive_reason.is.null,status.eq.${status})`;
  }
  // A QRIS pending row without a merchant order is an abandoned payment
  // attempt, not a real transaction. Excluding it here keeps the count and
  // pagination consistent with the rows rendered by the legacy path.
  visibilityFilter = `and(${visibilityFilter},or(provider.neq.QRIS,status.neq.pending,merchant_order_id.not.is.null))`;

  const buildFilteredQuery = (select: string) => {
    let query = supabase
      .from("transactions")
      .select(select, { count: "exact" });
    if (paymentMethod !== "all") {
      query = query.eq("provider", paymentMethod);
    }
    if (packageName && packageName !== "all") {
      query = query.ilike("package_name", `%${packageName}%`);
    }
    if (booth && booth !== "all") query = query.eq("booth", booth);
    query = query.or(visibilityFilter);
    const fromDate = filters.fromDate || filters.date;
    const toDate = filters.toDate || filters.date;
    if (fromDate) query = query.gte("created_at", `${fromDate}T00:00:00+07:00`);
    if (toDate) {
      const end = new Date(`${toDate}T00:00:00+07:00`);
      if (!Number.isNaN(end.getTime())) {
        end.setUTCDate(end.getUTCDate() + 1);
        query = query.lt("created_at", end.toISOString());
      }
    }
    return query;
  };

  if (search) {
    const escaped = search.replace(/[%(),]/g, " ").trim();
    if (escaped) {
      visibilityFilter = `and(${visibilityFilter},or(id.ilike.%${escaped}%,booth.ilike.%${escaped}%,customer.ilike.%${escaped}%,package_name.ilike.%${escaped}%))`;
    }
  }

  const query = buildFilteredQuery(TRANSACTION_COLUMNS)
    .order("created_at", { ascending: false })
    .range(pagination.from, pagination.to);
  const summaryQuery = buildFilteredQuery(
    "status,paid_at,print_count,amount,provider,archived_at,archive_reason,payout_status",
  );
  const [{ data, error, count }, { data: summaryRows, error: summaryError }] =
    await Promise.all([query, summaryQuery]);
  const rows = assertSupabaseResult(
    data as TransactionRow[] | null,
    error,
    "Unable to load transactions",
  );
  const summaryRowsData = assertSupabaseResult(
    summaryRows as Array<{
      status: string | null;
      paid_at: string | null;
      print_count: number | null;
      amount: number | string | null;
      provider: string | null;
      archived_at: string | null;
      archive_reason: string | null;
      payout_status: string | null;
    }> | null,
    summaryError,
    "Unable to load transaction summary",
  );
  const paidRows = summaryRowsData.filter(
    (row) =>
      (row.status === "paid" || row.paid_at !== null) &&
      row.archive_reason !== "testing" &&
      row.payout_status !== "testing" &&
      !(row.archived_at !== null && row.archive_reason !== "testing"),
  );
  const summaryData = {
    transaction_count: summaryRowsData.length,
    paid_count: paidRows.length,
    print_count: paidRows.reduce((sum, row) => sum + Number(row.print_count ?? 0), 0),
    gross_revenue: paidRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
    qris_gross_revenue: paidRows
      .filter((row) => row.provider === "QRIS")
      .reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
    qris_paid_count: paidRows.filter((row) => row.provider === "QRIS").length,
  };
  const transactions = rows
    .filter((row) => !isOrphanQrisPendingTransaction(row))
    .map(mapTransaction);

  const summary: TransactionPageSummary = {
    transactionCount: Number(summaryData?.transaction_count ?? 0),
    paidCount: Number(summaryData?.paid_count ?? 0),
    printCount: Number(summaryData?.print_count ?? 0),
    grossRevenue: Number(summaryData?.gross_revenue ?? 0),
    qrisGrossRevenue: Number(summaryData?.qris_gross_revenue ?? 0),
    qrisPaidCount: Number(summaryData?.qris_paid_count ?? 0),
  };

  return {
    ...toPaginatedResult(
      await attachPendingActions(supabase, transactions),
      pagination,
      Math.max(0, count ?? 0),
    ),
    summary,
  };
}

function actionLabel(action: TransactionActionType) {
  if (action === "verify") return "Verifikasi";
  if (action === "refund") return "Refund";
  return "Arsip";
}

function normalizeAction(value: string): TransactionActionType {
  if (value === "verify" || value === "refund" || value === "archive") {
    return value;
  }
  throw new Error("Action transaksi tidak valid.");
}

async function notifySafely(
  input: Parameters<typeof createAdminNotification>[1],
) {
  try {
    await createAdminNotification(createSupabaseAdminClient(), input);
  } catch (error) {
    console.error("[transaction-notification]", error);
  }
}

function mapTransactionActionRequest(
  row: TransactionActionRequestRow,
): TransactionActionRequest {
  const organization = Array.isArray(row.organizations)
    ? row.organizations[0]
    : row.organizations;
  const requester = Array.isArray(row.profiles)
    ? row.profiles[0]
    : row.profiles;
  const transaction = Array.isArray(row.transactions)
    ? row.transactions[0]
    : row.transactions;

  return {
    id: row.id,
    transactionId: row.transaction_id,
    organizationId: row.organization_id,
    organizationName: organization?.name ?? null,
    action: row.action,
    status: row.status,
    reason: row.reason,
    requestedBy: row.requested_by,
    requestedByEmail: requester?.email ?? null,
    requestedAt: row.requested_at,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNotes: row.review_notes,
    transaction: transaction
      ? {
          id: transaction.id,
          booth: transaction.booth ?? "-",
          packageName: transaction.package_name ?? "-",
          amount: Number(transaction.amount ?? 0),
          status: transaction.status ?? "pending",
          provider: transaction.provider ?? "Cash",
          createdAt: transaction.created_at ?? row.requested_at,
        }
      : null,
  };
}

export async function getTransactions({
  includeArchived = false,
}: {
  includeArchived?: boolean;
} = {}): Promise<Transaction[]> {
  const { supabase } = await getAdminContext();
  let query = supabase
    .from("transactions")
    .select(TRANSACTION_COLUMNS)
    .order("created_at", { ascending: false });

  if (!includeArchived) {
    query = query
      .is("archived_at", null)
      .or("archive_reason.is.null,archive_reason.neq.testing");
  }

  const { data, error } = await query;

  const rows = assertSupabaseResult(
    data as TransactionRow[] | null,
    error,
    "Unable to load transactions",
  );
  const transactions = rows
    .filter((row) => !isOrphanQrisPendingTransaction(row))
    .map(mapTransaction);
  const ids = transactions.map((transaction) => transaction.id);
  if (ids.length === 0) return transactions;

  const { data: requests, error: requestError } = await supabase
    .from("transaction_action_requests")
    .select("id,transaction_id,action,status,requested_at")
    .eq("status", "requested")
    .in("transaction_id", ids);

  if (requestError) {
    if (requestError.code === "42P01" || requestError.code === "42703") {
      return transactions;
    }
    throw new Error(
      `Unable to load transaction action requests: ${requestError.message}`,
    );
  }

  const pendingByTransaction = new Map<string, TransactionPendingAction>();
  for (const request of (requests ?? []) as Array<{
    id: string;
    transaction_id: string;
    action: TransactionActionType;
    status: TransactionActionStatus;
    requested_at: string;
  }>) {
    pendingByTransaction.set(request.transaction_id, {
      id: request.id,
      action: request.action,
      status: request.status,
      requestedAt: request.requested_at,
    });
  }

  return transactions.map((transaction) => ({
    ...transaction,
    pendingAction: pendingByTransaction.get(transaction.id) ?? null,
  }));
}

function isOrphanQrisPendingTransaction(row: TransactionRow) {
  return (
    row.provider === "QRIS" &&
    row.status === "pending" &&
    !row.merchant_order_id
  );
}

export async function getFailedPrintsByBooth(
  boothName: string,
): Promise<Transaction[]> {
  const { supabase } = await getAdminContext();
  const { data, error } = await supabase
    .from("transactions")
    .select(TRANSACTION_COLUMNS)
    .is("archived_at", null)
    .or("archive_reason.is.null,archive_reason.neq.testing")
    .eq("booth", boothName)
    .in("print_status", ["failed", "pending"])
    .order("created_at", { ascending: false })
    .limit(50);

  return assertSupabaseResult(
    data as TransactionRow[] | null,
    error,
    "Unable to load failed prints",
  )
    .filter((row) => !isOrphanQrisPendingTransaction(row))
    .map(mapTransaction);
}

export async function retryPrint(transactionId: string): Promise<void> {
  const { supabase, user } = await getAdminContext();

  const { data: current, error: readError } = await supabase
    .from("transactions")
    .select("id,organization_id,booth,print_attempts,print_count")
    .eq("id", transactionId)
    .maybeSingle();

  if (readError) {
    throw new Error(`Unable to load transaction: ${readError.message}`);
  }
  const transaction = current as RetryPrintTransactionRow | null;
  if (!transaction) {
    throw new Error("Unable to queue reprint: transaction not found");
  }

  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .select("id")
    .eq("organization_id", transaction.organization_id)
    .eq("name", transaction.booth)
    .maybeSingle();

  if (deviceError) {
    throw new Error(`Unable to load device: ${deviceError.message}`);
  }
  if (!device?.id) {
    throw new Error("Unable to queue reprint: source device not found");
  }

  const { data: framed, error: framedError } = await supabase
    .from("gallery_photos")
    .select("secure_url")
    .eq("session_id", transaction.id)
    .eq("organization_id", transaction.organization_id)
    .eq("kind", "framed")
    .order("photo_index", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (framedError) {
    throw new Error(`Unable to load framed photo: ${framedError.message}`);
  }
  if (!framed?.secure_url) {
    throw new Error(
      "Unable to queue reprint: framed photo is not available for this transaction",
    );
  }

  const copies = Math.max(
    1,
    Math.min(20, Math.round(transaction.print_count ?? 1)),
  );
  const { error: jobError } = await supabase.from("device_print_jobs").insert({
    organization_id: transaction.organization_id,
    device_id: device.id,
    gallery_session_id: transaction.id,
    source_url: framed.secure_url,
    copies,
    requested_by: user.id,
  });

  if (jobError) {
    throw new Error(`Unable to create print job: ${jobError.message}`);
  }

  const attempts = (transaction.print_attempts ?? 0) + 1;

  const { error } = await supabase
    .from("transactions")
    .update({
      print_status: "reprinting",
      print_attempts: attempts,
      print_last_attempt_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", transactionId);

  if (error) throw new Error(`Unable to queue reprint: ${error.message}`);
}

export async function requestTransactionAction({
  transactionId,
  action,
  reason,
}: {
  transactionId: string;
  action: TransactionActionType;
  reason?: string;
}): Promise<void> {
  const normalizedAction = normalizeAction(action);
  const { supabase, user } = await getAdminContext();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id,organization_id,booth,location,customer,package_name,amount,status,provider,created_at,paid_at,archived_at",
    )
    .eq("id", transactionId)
    .maybeSingle();

  if (error) throw new Error(`Gagal memuat transaksi: ${error.message}`);
  const transaction = data as TransactionForActionRow | null;
  if (!transaction) throw new Error("Transaksi tidak ditemukan.");
  if (transaction.archived_at) throw new Error("Transaksi sudah diarsipkan.");
  if (normalizedAction === "verify" && transaction.status === "paid") {
    throw new Error("Transaksi sudah paid, tidak perlu verifikasi manual.");
  }
  if (normalizedAction === "refund" && transaction.status !== "paid") {
    throw new Error("Refund hanya bisa diajukan untuk transaksi paid.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", transaction.organization_id)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (membershipError) {
    throw new Error(
      `Gagal memeriksa akses organisasi: ${membershipError.message}`,
    );
  }
  if (!membership && !(await isSuperAdminProfile(supabase, user.id))) {
    throw new Error("Anda tidak punya akses ke transaksi ini.");
  }

  const { data: actionRequest, error: insertError } = await supabase
    .from("transaction_action_requests")
    .insert({
      transaction_id: transaction.id,
      organization_id: transaction.organization_id,
      action: normalizedAction,
      reason: reason?.trim() || null,
      requested_by: user.id,
      transaction_snapshot: {
        booth: transaction.booth,
        location: transaction.location,
        customer: transaction.customer,
        packageName: transaction.package_name,
        amount: transaction.amount,
        status: transaction.status,
        provider: transaction.provider,
        createdAt: transaction.created_at,
      },
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      throw new Error(
        `${actionLabel(normalizedAction)} sudah menunggu approval.`,
      );
    }
    throw new Error(`Gagal membuat request: ${insertError.message}`);
  }

  await notifySafely({
    audience: "superadmin",
    type: `transaction.${normalizedAction}.requested`,
    title: `${actionLabel(normalizedAction)} transaksi`,
    body: `${transaction.id} menunggu approval Super Admin.`,
    href: "/superadmin",
    organizationId: transaction.organization_id,
    metadata: {
      requestId: actionRequest?.id,
      transactionId: transaction.id,
      action: normalizedAction,
      amount: transaction.amount,
    },
  });
}

export async function markTransactionAsTesting(
  transactionId: string,
): Promise<void> {
  const { supabase, user, organizationId } = await verifyRole([
    "owner",
    "admin",
    "akuntan",
  ]);

  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id,organization_id,archived_at,archive_reason,payout_status,payout_invoice_id",
    )
    .eq("id", transactionId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(`Gagal memuat transaksi: ${error.message}`);
  const transaction = data as TransactionForActionRow | null;
  if (!transaction) throw new Error("Transaksi tidak ditemukan.");
  if (transaction.archived_at && transaction.archive_reason !== "testing") {
    throw new Error("Transaksi sudah diarsipkan.");
  }
  if (
    transaction.archive_reason === "testing" ||
    transaction.payout_status === "testing"
  ) {
    throw new Error("Transaksi sudah ditandai sebagai mode testing.");
  }
  if (transaction.payout_status || transaction.payout_invoice_id) {
    throw new Error(
      "Transaksi sudah masuk proses payout sehingga tidak bisa ditandai testing.",
    );
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("transactions")
    .update({
      archived_by: user.id,
      archive_reason: "testing",
      payout_status: "testing",
      updated_at: now,
    })
    .eq("id", transaction.id)
    .eq("organization_id", organizationId)
    .is("payout_status", null)
    .is("payout_invoice_id", null);

  if (updateError) {
    throw new Error(`Gagal menandai transaksi testing: ${updateError.message}`);
  }

  const adminClient = createSupabaseAdminClient();
  const { error: ledgerError } = await adminClient
    .from("payment_ledger_entries")
    .update({
      settlement_status: "testing",
      updated_at: now,
    })
    .eq("transaction_id", transaction.id)
    .eq("organization_id", organizationId)
    .is("settlement_status", null)
    .is("payout_invoice_id", null);

  if (
    ledgerError &&
    ledgerError.code !== "42P01" &&
    ledgerError.code !== "42703"
  ) {
    throw new Error(`Gagal mengunci ledger testing: ${ledgerError.message}`);
  }
}

export async function unmarkTransactionAsTesting(
  transactionId: string,
): Promise<void> {
  const { supabase, organizationId } = await verifyRole([
    "owner",
    "admin",
    "akuntan",
  ]);

  const { data, error } = await supabase
    .from("transactions")
    .select("id,organization_id,archive_reason,payout_status,payout_invoice_id")
    .eq("id", transactionId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(`Gagal memuat transaksi: ${error.message}`);
  const transaction = data as TransactionForActionRow | null;
  if (!transaction) throw new Error("Transaksi tidak ditemukan.");
  if (
    transaction.archive_reason !== "testing" &&
    transaction.payout_status !== "testing"
  ) {
    throw new Error("Transaksi ini tidak sedang dalam mode testing.");
  }
  if (transaction.payout_invoice_id) {
    throw new Error(
      "Transaksi sudah masuk invoice payout sehingga mode testing tidak bisa dibatalkan.",
    );
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("transactions")
    .update({
      archived_at: null,
      archived_by: null,
      archive_reason: null,
      payout_status: null,
      updated_at: now,
    })
    .eq("id", transaction.id)
    .eq("organization_id", organizationId)
    .or("archive_reason.eq.testing,payout_status.eq.testing")
    .is("payout_invoice_id", null);

  if (updateError) {
    throw new Error(`Gagal membatalkan mode testing: ${updateError.message}`);
  }

  const adminClient = createSupabaseAdminClient();
  const { error: ledgerError } = await adminClient
    .from("payment_ledger_entries")
    .update({
      settlement_status: null,
      updated_at: now,
    })
    .eq("transaction_id", transaction.id)
    .eq("organization_id", organizationId)
    .eq("settlement_status", "testing")
    .is("payout_invoice_id", null);

  if (
    ledgerError &&
    ledgerError.code !== "42P01" &&
    ledgerError.code !== "42703"
  ) {
    throw new Error(`Gagal membuka ledger testing: ${ledgerError.message}`);
  }
}

async function requireSuperAdmin() {
  const context = await getAdminContext();
  if (!(await isSuperAdminProfile(context.supabase, context.user.id))) {
    throw new Error("Hanya superadmin yang bisa review request transaksi.");
  }
  return context;
}

export async function getTransactionActionRequestsForSuperadmin(
  paginationInput?: PaginationInput,
): Promise<PaginatedResult<TransactionActionRequest>> {
  const { supabase } = await requireSuperAdmin();
  const pagination = normalizePagination(paginationInput);
  const { data, error, count } = await supabase
    .from("transaction_action_requests")
    .select(
      `
      id,
      transaction_id,
      organization_id,
      action,
      status,
      reason,
      requested_by,
      requested_at,
      reviewed_by,
      reviewed_at,
      review_notes,
      organizations(name),
      profiles!transaction_action_requests_requested_by_fkey(email),
      transactions(id,booth,package_name,amount,status,provider,created_at)
    `,
      { count: "exact" },
    )
    .order("requested_at", { ascending: false })
    .range(pagination.from, pagination.to);

  if (error)
    throw new Error(`Gagal memuat request transaksi: ${error.message}`);
  return toPaginatedResult(
    ((data ?? []) as unknown as TransactionActionRequestRow[]).map(
      mapTransactionActionRequest,
    ),
    pagination,
    count ?? 0,
  );
}

export async function reviewTransactionActionRequest({
  requestId,
  decision,
  notes,
}: {
  requestId: string;
  decision: "approved" | "rejected";
  notes?: string;
}): Promise<void> {
  const { supabase, user } = await requireSuperAdmin();
  const { data, error } = await supabase
    .from("transaction_action_requests")
    .select("id,transaction_id,organization_id,requested_by,action,status")
    .eq("id", requestId)
    .maybeSingle();

  if (error) throw new Error(`Gagal memuat request: ${error.message}`);
  const request = data as {
    id: string;
    transaction_id: string;
    organization_id: string;
    requested_by: string | null;
    action: TransactionActionType;
    status: TransactionActionStatus;
  } | null;
  if (!request) throw new Error("Request tidak ditemukan.");
  if (request.status !== "requested") {
    throw new Error("Request ini sudah direview.");
  }

  const now = new Date().toISOString();
  if (decision === "approved") {
    const transactionPatch: Record<string, unknown> = {
      updated_at: now,
    };

    if (request.action === "verify") {
      transactionPatch.status = "paid";
      transactionPatch.paid_at = now;
    } else if (request.action === "refund") {
      transactionPatch.status = "refunded";
    } else if (request.action === "archive") {
      transactionPatch.archived_at = now;
      transactionPatch.archived_by = user.id;
      transactionPatch.archive_reason = notes?.trim() || "Approved archive";
    }

    const { error: updateError } = await supabase
      .from("transactions")
      .update(transactionPatch)
      .eq("id", request.transaction_id);
    if (updateError) {
      throw new Error(`Gagal menerapkan action: ${updateError.message}`);
    }
  }

  const { error: reviewError } = await supabase
    .from("transaction_action_requests")
    .update({
      status: decision,
      reviewed_by: user.id,
      reviewed_at: now,
      review_notes: notes?.trim() || null,
      updated_at: now,
    })
    .eq("id", request.id);

  if (reviewError) {
    throw new Error(`Gagal menyimpan review: ${reviewError.message}`);
  }

  await notifySafely({
    audience: request.requested_by ? "user" : "organization",
    recipientProfileId: request.requested_by,
    organizationId: request.organization_id,
    type: `transaction.${request.action}.${decision}`,
    title:
      decision === "approved"
        ? `${actionLabel(request.action)} disetujui`
        : `${actionLabel(request.action)} ditolak`,
    body: `Request untuk transaksi ${request.transaction_id} sudah direview.`,
    href: "/transactions",
    metadata: {
      requestId: request.id,
      transactionId: request.transaction_id,
      action: request.action,
      decision,
    },
  });
}
