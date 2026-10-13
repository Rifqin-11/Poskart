"use server";

import { getServiceRoleClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/server/admin/context";
import {
  refreshSubscriptionPayment,
} from "@/server/subscription/payment-reconciliation";
import type {
  SubscriptionPayment,
  SubscriptionPaymentStatus,
} from "@/features/billing/subscription/payment-types";

export type AdminSubscriptionPaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired";

export type AdminSubscriptionPaymentFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: AdminSubscriptionPaymentStatus | "all";
  gateway?: "all" | "duitku" | "midtrans";
  from?: string;
  to?: string;
};

export type AdminSubscriptionPayment = {
  id: string;
  merchantOrderId: string;
  organizationId: string | null;
  organizationName: string | null;
  profileId: string | null;
  profileEmail: string | null;
  customerName: string;
  email: string;
  whatsapp: string;
  companyName: string | null;
  planId: string;
  planName: string;
  amount: number;
  durationMonths: number;
  deviceCount: number;
  includedDevices: number;
  additionalDevices: number;
  baseAmount: number;
  additionalDeviceAmount: number;
  additionalDevicePriceMonthly: number;
  rawStatus: SubscriptionPaymentStatus;
  status: AdminSubscriptionPaymentStatus;
  paymentGateway: string;
  paymentUrl: string | null;
  createdAt: string;
  updatedAt: string;
  gatewayStatusCheckedAt: string | null;
  subscriptionActivatedAt: string | null;
  paymentExpiresAt: string;
  paymentClosedReason: "expired" | "user_cancelled" | null;
  paymentCancelledAt: string | null;
  gatewayCancelledAt: string | null;
  paymentReference: string | null;
  paymentMethod: string | null;
  gatewayResponse: Record<string, unknown> | null;
};

export type AdminSubscriptionPaymentOverride = {
  id: string;
  merchantOrderId: string;
  adminProfileId: string;
  previousStatus: SubscriptionPaymentStatus;
  nextStatus: "paid" | "failed";
  reason: string;
  createdAt: string;
};

export type AdminSubscriptionPaymentDetail = AdminSubscriptionPayment & {
  overrides: AdminSubscriptionPaymentOverride[];
};

export type AdminSubscriptionPaymentSummary = {
  total: number;
  pending: number;
  paid: number;
  failed: number;
  cancelled: number;
  expired: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
};

export type AdminSubscriptionPaymentList = {
  items: AdminSubscriptionPayment[];
  total: number;
  page: number;
  pageSize: number;
  summary: AdminSubscriptionPaymentSummary;
};

export type AdminSubscriptionPaymentOverrideInput = {
  id: string;
  status: "paid" | "failed";
  reason: string;
};

const PAYMENT_COLUMNS = [
  "id",
  "merchant_order_id",
  "organization_id",
  "profile_id",
  "plan_id",
  "plan_name",
  "amount",
  "duration_months",
  "device_count",
  "included_devices",
  "additional_devices",
  "base_amount",
  "additional_device_amount",
  "additional_device_price_monthly",
  "customer_name",
  "email",
  "whatsapp",
  "company_name",
  "status",
  "payment_gateway",
  "payment_url",
  "created_at",
  "updated_at",
  "gateway_status_checked_at",
  "subscription_activated_at",
  "payment_expires_at",
  "payment_closed_reason",
  "payment_cancelled_at",
  "gateway_cancelled_at",
  "payment_reference",
  "payment_method",
  "gateway_response",
].join(",");

type RawRelationValue = { name?: string | null; email?: string | null };
type RawRelation = RawRelationValue | RawRelationValue[] | null;

type RawPaymentRow = {
  id: string;
  merchant_order_id: string;
  organization_id: string | null;
  profile_id: string | null;
  plan_id: string;
  plan_name: string;
  amount: number | string;
  duration_months: number | string;
  device_count: number | string;
  included_devices: number | string;
  additional_devices: number | string;
  base_amount: number | string;
  additional_device_amount: number | string;
  additional_device_price_monthly: number | string;
  customer_name: string;
  email: string;
  whatsapp: string;
  company_name: string | null;
  status: SubscriptionPaymentStatus;
  payment_gateway: string;
  payment_url: string | null;
  created_at: string;
  updated_at: string;
  gateway_status_checked_at: string | null;
  subscription_activated_at: string | null;
  payment_expires_at: string;
  payment_closed_reason: "expired" | "user_cancelled" | null;
  payment_cancelled_at: string | null;
  gateway_cancelled_at: string | null;
  payment_reference: string | null;
  payment_method: string | null;
  gateway_response: Record<string, unknown> | null;
  organizations?: RawRelation;
  profiles?: RawRelation;
};

type RawOverrideRow = {
  id: string;
  merchant_order_id: string;
  admin_profile_id: string;
  previous_status: SubscriptionPaymentStatus;
  next_status: "paid" | "failed";
  reason: string;
  created_at: string;
};

function relationValue(relation: RawRelation | undefined, key: "name" | "email") {
  const value = Array.isArray(relation) ? relation[0] : relation;
  return value?.[key] ?? null;
}

function numberValue(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function displayStatus(row: RawPaymentRow): AdminSubscriptionPaymentStatus {
  if (
    row.status === "pending" &&
    row.payment_expires_at &&
    new Date(row.payment_expires_at).getTime() <= Date.now()
  ) {
    return "expired";
  }
  if (row.payment_closed_reason === "expired") return "expired";
  return row.status;
}

function mapPayment(row: RawPaymentRow): AdminSubscriptionPayment {
  return {
    id: row.id,
    merchantOrderId: row.merchant_order_id,
    organizationId: row.organization_id,
    organizationName: relationValue(row.organizations, "name"),
    profileId: row.profile_id,
    profileEmail: relationValue(row.profiles, "email"),
    customerName: row.customer_name,
    email: row.email,
    whatsapp: row.whatsapp,
    companyName: row.company_name,
    planId: row.plan_id,
    planName: row.plan_name,
    amount: numberValue(row.amount),
    durationMonths: numberValue(row.duration_months),
    deviceCount: numberValue(row.device_count),
    includedDevices: numberValue(row.included_devices),
    additionalDevices: numberValue(row.additional_devices),
    baseAmount: numberValue(row.base_amount),
    additionalDeviceAmount: numberValue(row.additional_device_amount),
    additionalDevicePriceMonthly: numberValue(row.additional_device_price_monthly),
    rawStatus: row.status,
    status: displayStatus(row),
    paymentGateway: row.payment_gateway,
    paymentUrl: row.payment_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    gatewayStatusCheckedAt: row.gateway_status_checked_at,
    subscriptionActivatedAt: row.subscription_activated_at,
    paymentExpiresAt: row.payment_expires_at,
    paymentClosedReason: row.payment_closed_reason,
    paymentCancelledAt: row.payment_cancelled_at,
    gatewayCancelledAt: row.gateway_cancelled_at,
    paymentReference: row.payment_reference,
    paymentMethod: row.payment_method,
    gatewayResponse: row.gateway_response,
  };
}

function escapeSearch(value: string) {
  return value.trim().replace(/[%,()\\]/g, "");
}

function validDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function nextDateStart(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString();
}

type FilterableQuery = {
  eq(column: string, value: string): FilterableQuery;
  neq(column: string, value: string): FilterableQuery;
  is(column: string, value: null): FilterableQuery;
  or(filters: string): FilterableQuery;
  ilike(column: string, value: string): FilterableQuery;
  gte(column: string, value: string): FilterableQuery;
  lt(column: string, value: string): FilterableQuery;
};

const PAYMENT_FETCH_CHUNK_SIZE = 1000;

async function expireStaleSubscriptionPayments(
  supabase: Awaited<ReturnType<typeof getServiceRoleClient>>,
) {
  const { error } = await supabase
    .from("subscription_orders")
    .update({
      status: "failed",
      payment_closed_reason: "expired",
      updated_at: new Date().toISOString(),
    })
    .eq("status", "pending")
    .lte("payment_expires_at", new Date().toISOString());
  if (error) throw new Error(`Unable to expire stale subscription payments: ${error.message}`);
}

async function organizationIdsForSearch(search: string) {
  const supabase = await getServiceRoleClient();
  const escaped = escapeSearch(search);
  if (!escaped) return [];
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .ilike("name", `%${escaped}%`)
    .limit(1000);
  if (error) throw new Error(`Unable to search organizations: ${error.message}`);
  return (data ?? []).map((row) => String(row.id));
}

function applyPaymentFilters<T>(
  query: T,
  filters: AdminSubscriptionPaymentFilters,
  organizationIds: string[],
) {
  const builder = query as unknown as FilterableQuery;
  let next = builder;
  const search = escapeSearch(filters.search ?? "");

  if (search) {
    const pattern = `%${search}%`;
    next = organizationIds.length
      ? next.or(`merchant_order_id.ilike.${pattern},organization_id.in.(${organizationIds.join(",")})`)
      : next.ilike("merchant_order_id", pattern);
  }

  if (filters.gateway && filters.gateway !== "all") {
    next = next.eq("payment_gateway", filters.gateway);
  }

  switch (filters.status) {
    case "pending":
      next = next.eq("status", "pending");
      break;
    case "paid":
      next = next.eq("status", "paid");
      break;
    case "cancelled":
      next = next.eq("status", "cancelled");
      break;
    case "expired":
      next = next.eq("status", "failed").eq("payment_closed_reason", "expired");
      break;
    case "failed":
      next = next.eq("status", "failed").or("payment_closed_reason.is.null,payment_closed_reason.neq.expired");
      break;
  }

  const from = validDate(filters.from);
  const to = validDate(filters.to);
  if (from) next = next.gte("created_at", `${from}T00:00:00.000Z`);
  if (to) next = next.lt("created_at", nextDateStart(to));

  return next as unknown as T;
}

async function fetchAllPaymentRows(
  supabase: Awaited<ReturnType<typeof getServiceRoleClient>>,
  columns: string,
  filters: AdminSubscriptionPaymentFilters,
  organizationIds: string[],
) {
  const rows: RawPaymentRow[] = [];

  for (let offset = 0; ; offset += PAYMENT_FETCH_CHUNK_SIZE) {
    const query = applyPaymentFilters(
      supabase
        .from("subscription_orders")
        .select(columns)
        .order("created_at", { ascending: false })
        .range(offset, offset + PAYMENT_FETCH_CHUNK_SIZE - 1),
      filters,
      organizationIds,
    );
    const { data, error } = await query;
    if (error) throw new Error(`Unable to load subscription payments: ${error.message}`);

    const chunk = (data ?? []) as unknown as RawPaymentRow[];
    rows.push(...chunk);
    if (chunk.length < PAYMENT_FETCH_CHUNK_SIZE) break;
  }

  return rows;
}

function emptySummary(): AdminSubscriptionPaymentSummary {
  return {
    total: 0,
    pending: 0,
    paid: 0,
    failed: 0,
    cancelled: 0,
    expired: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
  };
}

function summarize(rows: Array<Pick<RawPaymentRow, "amount" | "status" | "payment_closed_reason">>) {
  const summary = emptySummary();
  summary.total = rows.length;
  for (const row of rows) {
    const amount = numberValue(row.amount);
    const status = row.payment_closed_reason === "expired" ? "expired" : row.status;
    summary.totalAmount += amount;
    if (status === "paid") {
      summary.paid += 1;
      summary.paidAmount += amount;
    } else if (status === "pending") {
      summary.pending += 1;
      summary.pendingAmount += amount;
    } else if (status === "failed") {
      summary.failed += 1;
    } else if (status === "cancelled") {
      summary.cancelled += 1;
    } else if (status === "expired") {
      summary.expired += 1;
    }
  }
  return summary;
}

async function requirePaymentAdmin() {
  const { user } = await requireSuperAdmin();
  return { user, supabase: await getServiceRoleClient() };
}

export async function listSubscriptionPayments(
  input: AdminSubscriptionPaymentFilters = {},
): Promise<AdminSubscriptionPaymentList> {
  await requireSuperAdmin();
  const supabase = await getServiceRoleClient();
  const page = Math.max(1, Math.trunc(input.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Math.trunc(input.pageSize ?? 20)));
  const offset = (page - 1) * pageSize;
  await expireStaleSubscriptionPayments(supabase);
  const organizationIds = await organizationIdsForSearch(input.search ?? "");

  const listQuery = applyPaymentFilters(
    supabase
      .from("subscription_orders")
      .select(`
        ${PAYMENT_COLUMNS},
        organizations(name),
        profiles(email)
      `, { count: "exact" }),
    input,
    organizationIds,
  );
  const { data, error, count } = await listQuery
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);
  if (error) throw new Error(`Unable to load subscription payments: ${error.message}`);

  const summaryRows = await fetchAllPaymentRows(
    supabase,
    "amount,status,payment_closed_reason",
    input,
    organizationIds,
  );

  return {
    items: ((data ?? []) as unknown as RawPaymentRow[]).map(mapPayment),
    total: count ?? 0,
    page,
    pageSize,
    summary: summarize(summaryRows),
  };
}

async function getPaymentDetailById(id: string) {
  const supabase = await getServiceRoleClient();
  const { data, error } = await supabase
    .from("subscription_orders")
    .select(`${PAYMENT_COLUMNS},organizations(name),profiles(email)`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Unable to load subscription payment: ${error.message}`);
  if (!data) return null;

  const { data: overrides, error: overrideError } = await supabase
    .from("subscription_payment_overrides")
    .select("id,merchant_order_id,admin_profile_id,previous_status,next_status,reason,created_at")
    .eq("subscription_order_id", id)
    .order("created_at", { ascending: false });
  if (overrideError) throw new Error(`Unable to load payment audit history: ${overrideError.message}`);

  return {
    ...mapPayment(data as unknown as RawPaymentRow),
    overrides: ((overrides ?? []) as RawOverrideRow[]).map((row) => ({
      id: row.id,
      merchantOrderId: row.merchant_order_id,
      adminProfileId: row.admin_profile_id,
      previousStatus: row.previous_status,
      nextStatus: row.next_status,
      reason: row.reason,
      createdAt: row.created_at,
    })),
  } satisfies AdminSubscriptionPaymentDetail;
}

export async function getSubscriptionPaymentDetail(id: string) {
  await requireSuperAdmin();
  const normalizedId = id.trim();
  if (!normalizedId) throw new Error("Subscription payment is required.");
  return getPaymentDetailById(normalizedId);
}

function toReconciliationOrder(row: RawPaymentRow): SubscriptionPayment {
  return {
    merchant_order_id: row.merchant_order_id,
    plan_name: row.plan_name,
    amount: numberValue(row.amount),
    duration_months: numberValue(row.duration_months),
    device_count: numberValue(row.device_count),
    status: row.status,
    payment_gateway: row.payment_gateway,
    payment_url: row.payment_url,
    created_at: row.created_at,
    gateway_status_checked_at: row.gateway_status_checked_at,
    subscription_activated_at: row.subscription_activated_at,
    payment_expires_at: row.payment_expires_at,
    payment_closed_reason: row.payment_closed_reason,
    payment_cancelled_at: row.payment_cancelled_at,
    gateway_cancelled_at: row.gateway_cancelled_at,
  };
}

export async function checkSubscriptionPayment(id: string) {
  const { supabase } = await requirePaymentAdmin();
  const normalizedId = id.trim();
  if (!normalizedId) throw new Error("Subscription payment is required.");

  const { data, error } = await supabase
    .from("subscription_orders")
    .select(PAYMENT_COLUMNS)
    .eq("id", normalizedId)
    .maybeSingle();
  if (error) throw new Error(`Unable to load subscription payment: ${error.message}`);
  if (!data) throw new Error("Subscription payment was not found.");

  const row = data as unknown as RawPaymentRow;
  if (!row.organization_id) throw new Error("This payment is not linked to an organization.");
  await refreshSubscriptionPayment(
    supabase,
    toReconciliationOrder(row),
    row.organization_id,
    true,
    true,
  );
  return getPaymentDetailById(normalizedId);
}

export async function overrideSubscriptionPayment(
  input: AdminSubscriptionPaymentOverrideInput,
) {
  const { user, supabase } = await requirePaymentAdmin();
  const id = input.id.trim();
  const reason = input.reason.trim();
  if (!id) throw new Error("Subscription payment is required.");
  if (input.status !== "paid" && input.status !== "failed") {
    throw new Error("Manual status must be paid or failed.");
  }
  if (reason.length < 10) throw new Error("Alasan override minimal 10 karakter.");

  const { error } = await supabase.rpc("admin_override_subscription_payment", {
    p_order_id: id,
    p_status: input.status,
    p_reason: reason,
    p_admin_profile_id: user.id,
  });
  if (error) throw new Error(`Unable to override subscription payment: ${error.message}`);
  return getPaymentDetailById(id);
}

function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function exportSubscriptionPayments(
  input: Omit<AdminSubscriptionPaymentFilters, "page" | "pageSize"> = {},
) {
  await requireSuperAdmin();
  const supabase = await getServiceRoleClient();
  await expireStaleSubscriptionPayments(supabase);
  const organizationIds = await organizationIdsForSearch(input.search ?? "");
  const rows = await fetchAllPaymentRows(
    supabase,
    `${PAYMENT_COLUMNS},organizations(name),profiles(email)`,
    input,
    organizationIds,
  );

  const mappedRows = rows.map(mapPayment);
  const header = [
    "Created At",
    "Organization",
    "Organization ID",
    "Order ID",
    "Customer",
    "Email",
    "Plan",
    "Duration Months",
    "Devices",
    "Amount",
    "Gateway",
    "Status",
    "Payment Reference",
    "Payment Method",
    "Gateway Checked At",
    "Subscription Activated At",
    "Manual Closed Reason",
  ];
  const lines = [header, ...mappedRows.map((row) => [
    row.createdAt,
    row.organizationName,
    row.organizationId,
    row.merchantOrderId,
    row.customerName,
    row.email,
    row.planName,
    row.durationMonths,
    row.deviceCount,
    row.amount,
    row.paymentGateway,
    row.status,
    row.paymentReference,
    row.paymentMethod,
    row.gatewayStatusCheckedAt,
    row.subscriptionActivatedAt,
    row.paymentClosedReason,
  ])].map((line) => line.map(csvCell).join(","));

  return lines.join("\r\n");
}
