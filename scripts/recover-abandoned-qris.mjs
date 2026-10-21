// Incident-scoped recovery, NOT a general balance adjustment tool.
// Preview: node --env-file=.env.local scripts/recover-abandoned-qris.mjs
// Apply only with owner authorization: add --apply.
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const target = {
  organizationId: "tnt_admin",
  transactionId: "MVCF4VIE-1EOUQ",
  ledgerId: "4bc3a38b-df52-4562-8f5e-cb660892ce16",
  orderId: "PK179224289482959009ce2",
  reference: "D2297126RTVFF62VNQI314X",
  gross: 13000, fee: 91, net: 12909,
};
const hash = createHash("sha256").update(`qris-abandonment-recovery-v1:${target.orderId}`).digest("hex");
const auditId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
const transactionColumns = "id,organization_id,provider,status,amount,collection_mode,payment_gateway,merchant_order_id,payment_reference,paid_at,archived_at,archived_by,archive_reason,payout_status,payout_invoice_id,updated_at";
const ledgerColumns = "id,organization_id,transaction_id,merchant_order_id,duitku_reference,status,gross_amount,gateway_fee_amount,net_amount,settlement_status,gateway_settlement_status,payout_invoice_id,updated_at";

async function checked(query) {
  const { data, error } = await query;
  if (error) throw new Error(`Recovery stopped: ${error.message}`);
  return data;
}

async function verifyGateway() {
  const merchantCode = process.env.DUITKU_MERCHANT_CODE?.trim();
  const apiKey = process.env.DUITKU_API_KEY?.trim();
  assert.ok(merchantCode && apiKey && process.env.DUITKU_SANDBOX === "false", "Production gateway credentials required.");
  const response = await fetch("https://passport.duitku.com/webapi/api/merchant/transactionStatus", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchantCode, merchantOrderId: target.orderId,
      signature: createHmac("sha256", apiKey).update(`${merchantCode}${target.orderId}`).digest("hex") }),
    signal: AbortSignal.timeout(12_000),
  });
  assert.ok(response.ok, `Gateway verification failed: HTTP ${response.status}`);
  const raw = await response.json();
  // Do not persist credentials, signatures or unrelated gateway/customer data.
  return { merchantOrderId: raw.merchantOrderId, reference: raw.reference, amount: Number(raw.amount), statusCode: raw.statusCode };
}

export async function recoverAbandonedQris(db, { apply = false, verify = verifyGateway } = {}) {
  const transaction = await checked(db.from("transactions").select(transactionColumns).eq("id", target.transactionId).single());
  const ledger = await checked(db.from("payment_ledger_entries").select(ledgerColumns).eq("id", target.ledgerId).single());
  assert.equal(transaction.organization_id, target.organizationId);
  assert.equal(transaction.provider, "QRIS");
  assert.equal(transaction.status, "paid");
  assert.equal(transaction.collection_mode, "platform");
  assert.equal(transaction.payment_gateway, "duitku");
  assert.equal(transaction.amount, target.gross);
  assert.equal(transaction.merchant_order_id, target.orderId);
  assert.equal(transaction.payment_reference, target.reference);
  assert.ok(transaction.paid_at);
  assert.equal(ledger.organization_id, target.organizationId);
  assert.equal(ledger.transaction_id, target.transactionId);
  assert.equal(ledger.merchant_order_id, target.orderId);
  assert.equal(ledger.duitku_reference, target.reference);
  assert.equal(ledger.status, "paid");
  assert.equal(ledger.gateway_settlement_status, "settled");
  assert.equal(ledger.gross_amount, target.gross);
  assert.equal(ledger.gateway_fee_amount, target.fee);
  assert.equal(ledger.net_amount, target.net);

  const verified = await verify();
  assert.deepEqual(verified, { merchantOrderId: target.orderId, reference: target.reference, amount: target.gross, statusCode: "00" });
  const audit = await checked(db.from("admin_notifications").select("id,metadata").eq("id", auditId).maybeSingle());
  if (audit?.metadata?.state === "completed") {
    assert.equal(transaction.archived_at, null);
    assert.equal(transaction.archive_reason, null);
    assert.notEqual(ledger.settlement_status, "abandoned");
    return { state: "already_recovered", orderId: target.orderId, netAmount: target.net };
  }

  const requests = await checked(db.from("transaction_action_requests").select("id")
    .eq("transaction_id", target.transactionId).in("action", ["refund", "archive"]).in("status", ["requested", "approved"]));
  assert.equal(requests.length, 0, "Refund/archive requests must be reviewed before recovery.");
  const allocations = await checked(db.from("payout_invoice_items").select("id").eq("ledger_entry_id", target.ledgerId));
  assert.equal(allocations.length, 0, "Existing payout allocations prevent recovery.");
  assert.equal(transaction.payout_invoice_id, null);
  assert.equal(ledger.payout_invoice_id, null);
  // Resume only our own audited partial repair; never clear arbitrary archives.
  const transactionRestored = transaction.archived_at === null && transaction.archive_reason === null && transaction.payout_status === null;
  assert.ok((transaction.archive_reason === "abandoned" && transaction.payout_status === "abandoned" && transaction.archived_at) || (audit && transactionRestored), "Unexpected transaction archive state.");
  assert.ok(ledger.settlement_status === "abandoned" || (audit && ledger.settlement_status === null), "Unexpected ledger settlement state.");

  if (!apply) return { state: "preview", orderId: target.orderId, netAmount: target.net, transaction, ledger, verified };
  const now = new Date().toISOString();
  const metadata = audit?.metadata ?? {
    state: "started", operation: "recover_abandoned_qris_v1", authorization: "Explicit owner request in maintenance session",
    startedAt: now, orderId: target.orderId, before: { transaction, ledger }, verified,
  };
  // Persist the original snapshot BEFORE changing either row. The stable audit
  // ID and compare-and-set writes make retries safe without adding new money.
  if (!audit) await checked(db.from("admin_notifications").insert({
    id: auditId, audience: "superadmin", organization_id: target.organizationId,
    type: "payment.qris.abandonment_recovery", title: "Pemulihan pencatatan QRIS",
    body: `Pemulihan ${target.orderId} dimulai; net Rp${target.net}.`, href: "/transactions", metadata,
  }));

  // Restore visibility first. Release the existing ledger last: a partial
  // failure must never manufacture a second transaction/ledger or payout.
  if (!transactionRestored) await checked(db.from("transactions").update({
    archived_at: null, archived_by: null, archive_reason: null, payout_status: null, updated_at: now,
  }).eq("id", target.transactionId).eq("organization_id", target.organizationId)
    .eq("provider", "QRIS").eq("status", "paid").eq("archive_reason", "abandoned")
    .eq("updated_at", transaction.updated_at).is("payout_invoice_id", null).select("id").single());

  if (ledger.settlement_status === "abandoned") await checked(db.from("payment_ledger_entries").update({
    settlement_status: null, updated_at: now,
  }).eq("id", target.ledgerId).eq("organization_id", target.organizationId).eq("transaction_id", target.transactionId)
    .eq("status", "paid").eq("settlement_status", "abandoned").eq("gateway_settlement_status", "settled")
    .eq("updated_at", ledger.updated_at).is("payout_invoice_id", null).select("id").single());

  const restoredTransaction = await checked(db.from("transactions").select(transactionColumns).eq("id", target.transactionId).single());
  const restoredLedger = await checked(db.from("payment_ledger_entries").select(ledgerColumns).eq("id", target.ledgerId).single());
  assert.equal(restoredTransaction.archived_at, null);
  assert.equal(restoredTransaction.archive_reason, null);
  assert.equal(restoredTransaction.payout_status, null);
  assert.equal(restoredTransaction.status, "paid");
  assert.equal(restoredLedger.settlement_status, null);
  assert.equal(restoredLedger.net_amount, target.net);
  await checked(db.from("admin_notifications").update({
    body: `Transaksi QRIS ${target.orderId} dipulihkan; net Rp${target.net} kembali memenuhi syarat saldo penarikan.`,
    metadata: { ...metadata, state: "completed", completedAt: new Date().toISOString(), after: { transaction: restoredTransaction, ledger: restoredLedger } },
  }).eq("id", auditId).select("id").single());
  return { state: "recovered", orderId: target.orderId, netAmount: target.net, auditId };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    assert.ok(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY, "Database credentials required.");
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    console.log(JSON.stringify(await recoverAbandonedQris(db, { apply: process.argv.includes("--apply") }), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
