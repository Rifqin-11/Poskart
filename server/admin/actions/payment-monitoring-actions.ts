"use server";

import { requireSuperAdmin } from "@/server/admin/context";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MonitoredPayment, PaymentMonitorFilters } from "@/types/payment-monitoring";

export async function getPaymentMonitoring(filters: PaymentMonitorFilters) {
  // Authorize every call before using the cross-organization service client.
  await requireSuperAdmin();
  const client = createSupabaseAdminClient();
  const page = Math.max(1, Math.min(100000, Math.floor(Number(filters.page) || 1)));
  const pageSize = 25;
  let query = client.from("transactions").select(
    "id,organization_id,merchant_order_id,payment_reference,collection_mode,status,amount,created_at,paid_at,gateway_status_checked_at,duitku_status_code",
    { count: "exact" },
  ).eq("provider", "QRIS").eq("payment_gateway", "duitku").not("merchant_order_id", "is", null);
  if (filters.organizationId) query = query.eq("organization_id", filters.organizationId);
  if (filters.status) {
    if (!["pending", "paid", "failed", "cancelled", "expired", "refunded"].includes(filters.status)) throw new Error("Status tidak valid.");
    query = query.eq("status", filters.status);
  }
  const search = (filters.search || "").trim();
  if (search) {
    // Only safe literal identifier characters can enter PostgREST's OR syntax.
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(search)) throw new Error("Cari menggunakan ID transaksi, order, atau referensi (huruf, angka, - dan _).");
    query = query.or(`id.ilike.%${search}%,merchant_order_id.ilike.%${search}%,payment_reference.ilike.%${search}%`);
  }
  for (const value of [filters.from, filters.to]) {
    if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value)) throw new Error("Tanggal tidak valid.");
  }
  if (filters.from && filters.to && filters.from > filters.to) throw new Error("Rentang tanggal tidak valid.");
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00+07:00`);
  if (filters.to) {
    const end = new Date(`${filters.to}T00:00:00+07:00`);
    end.setTime(end.getTime() + 86400000);
    query = query.lt("created_at", end.toISOString());
  }
  const { data: transactions, count, error } = await query.order("created_at", { ascending: false })
    .order("id", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw new Error("Data pembayaran tidak dapat dimuat.");
  if (!transactions?.length) return { items: [] as MonitoredPayment[], total: count ?? 0, pageSize };
  const { data: ledgers, error: ledgerError } = await client.from("payment_ledger_entries")
    .select("id,transaction_id,organization_id,merchant_order_id,duitku_reference,status,settlement_status,gross_amount,gateway_fee_amount,net_amount,gateway_settlement_status,gateway_settlement_date")
    .in("merchant_order_id", transactions.map(t => t.merchant_order_id));
  if (ledgerError) throw new Error("Ledger pembayaran tidak dapat dimuat.");
  const ledgerIds = (ledgers ?? []).map(l => l.id);
  // Fetch all allocations, not a silently truncated first 1,000 rows.
  const allocations: Array<{ ledger_entry_id: string; payout_invoice_id: string; gross_amount: number }> = [];
  if (ledgerIds.length) {
    for (let start = 0; ; start += 500) {
      const { data, error: allocationError } = await client.from("payout_invoice_items")
        .select("ledger_entry_id,payout_invoice_id,gross_amount").in("ledger_entry_id", ledgerIds)
        .order("id").range(start, start + 499);
      if (allocationError) throw new Error("Alokasi withdrawal tidak dapat dimuat.");
      allocations.push(...(data ?? []));
      if ((data?.length ?? 0) < 500) break;
    }
  }
  const invoiceIds = [...new Set(allocations.map(a => a.payout_invoice_id))];
  const invoices = new Map<string, { invoice_number: string; status: string }>();
  for (let start = 0; start < invoiceIds.length; start += 200) {
    const { data, error: invoiceError } = await client.from("payout_invoices")
      .select("id,invoice_number,status").in("id", invoiceIds.slice(start, start + 200));
    if (invoiceError) throw new Error("Invoice withdrawal tidak dapat dimuat.");
    for (const invoice of data ?? []) invoices.set(invoice.id, invoice);
  }
  const items: MonitoredPayment[] = transactions.map(t => {
    const l = ledgers?.find(l => l.merchant_order_id === t.merchant_order_id);
    const warnings: string[] = [];
    if (t.status === "paid" && t.collection_mode === "platform" && !l) warnings.push("Paid tanpa ledger");
    if (l && (l.organization_id !== t.organization_id || l.transaction_id !== t.id)) warnings.push("Identitas ledger berbeda");
    if (l && Number(l.gross_amount) !== Number(t.amount)) warnings.push("Nominal ledger berbeda");
    if (l && l.duitku_reference !== t.payment_reference) warnings.push("Referensi berbeda");
    if (l && t.status !== "paid") warnings.push("Status transaksi dan ledger perlu diperiksa");
    if (l?.settlement_status) warnings.push(`Ledger ditandai: ${l.settlement_status}`);
    if (t.status === "pending" && Date.now() - Date.parse(t.created_at) > 86400000) warnings.push("Pending lebih dari 24 jam");
    return {
      id: t.id, organizationId: t.organization_id, orderId: t.merchant_order_id,
      reference: t.payment_reference, collectionMode: t.collection_mode,
      status: t.status, amount: Number(t.amount), createdAt: t.created_at,
      paidAt: t.paid_at, checkedAt: t.gateway_status_checked_at, gatewayCode: t.duitku_status_code,
      ledger: l ? { id: l.id, gross: Number(l.gross_amount), fee: Number(l.gateway_fee_amount), net: Number(l.net_amount),
        status: l.status, hold: l.settlement_status, settlement: l.gateway_settlement_status, settlementDate: l.gateway_settlement_date } : null,
      allocations: allocations.filter(a => a.ledger_entry_id === l?.id).map(a => ({
        invoiceId: a.payout_invoice_id, invoiceNumber: invoices.get(a.payout_invoice_id)?.invoice_number ?? a.payout_invoice_id,
        status: invoices.get(a.payout_invoice_id)?.status ?? "unknown", gross: Number(a.gross_amount),
      })), warnings,
    };
  });
  return { items, total: count ?? 0, pageSize };
}
