// Run: node --test scripts/test-qris-recovery.mjs (in-memory only).
import assert from "node:assert/strict";
import { test } from "node:test";
import { recoverAbandonedQris } from "./recover-abandoned-qris.mjs";

function fixture() {
  const transaction = {
    id: "MVCF4VIE-1EOUQ", organization_id: "tnt_admin", provider: "QRIS", status: "paid", amount: 13000,
    collection_mode: "platform", payment_gateway: "duitku", merchant_order_id: "PK179224289482959009ce2",
    payment_reference: "D2297126RTVFF62VNQI314X", paid_at: "2026-10-17T13:15:55Z",
    archived_at: "2026-10-17T13:16:47Z", archived_by: "original-user", archive_reason: "abandoned",
    payout_status: "abandoned", payout_invoice_id: null, updated_at: "2026-10-17T13:19:22Z",
  };
  const ledger = {
    id: "4bc3a38b-df52-4562-8f5e-cb660892ce16", organization_id: "tnt_admin", transaction_id: transaction.id,
    merchant_order_id: transaction.merchant_order_id, duitku_reference: transaction.payment_reference,
    status: "paid", gross_amount: 13000, gateway_fee_amount: 91, net_amount: 12909,
    settlement_status: "abandoned", gateway_settlement_status: "settled", payout_invoice_id: null,
    updated_at: "2026-10-18T17:37:36Z",
  };
  const rows = { transactions: [transaction], payment_ledger_entries: [ledger], transaction_action_requests: [], payout_invoice_items: [], admin_notifications: [] };
  const writes = [];
  let failLedgerOnce = false;
  const db = {
    from(table) {
      const filters = [];
      let update, insertion;
      function execute(single = false) {
        if (table === "payment_ledger_entries" && update && failLedgerOnce) {
          failLedgerOnce = false;
          return { error: { message: "simulated ledger failure" }, data: null };
        }
        const selected = rows[table].filter(row => filters.every(filter => filter(row)));
        if (insertion) { rows[table].push(structuredClone(insertion)); writes.push({ table, insert: true }); }
        if (update) for (const row of selected) { Object.assign(row, structuredClone(update)); writes.push({ table, update: true }); }
        return { data: single ? selected[0] ? structuredClone(selected[0]) : null : structuredClone(selected), error: null };
      }
      const query = {
        select() { return query; },
        eq(key, value) { filters.push(row => row[key] === value); return query; },
        is(key, value) { return query.eq(key, value); },
        in(key, values) { filters.push(row => values.includes(row[key])); return query; },
        insert(value) { insertion = value; return query; },
        update(value) { update = value; return query; },
        async single() { const result = execute(true); return result.data || result.error ? result : { data: null, error: { message: "No rows matched" } }; },
        async maybeSingle() { return execute(true); },
        then(resolve, reject) { return Promise.resolve(execute()).then(resolve, reject); },
      };
      return query;
    },
  };
  const verify = async () => ({ merchantOrderId: transaction.merchant_order_id, reference: transaction.payment_reference, amount: 13000, statusCode: "00" });
  return { db, transaction, ledger, rows, writes, verify, failLedger: () => { failLedgerOnce = true; } };
}

test("preview verifies but does not change any data", async () => {
  const f = fixture();
  assert.equal((await recoverAbandonedQris(f.db, { verify: f.verify })).state, "preview");
  assert.equal(f.writes.length, 0);
});

test("authorized recovery restores existing rows without creating transactions, money or payouts", async () => {
  const f = fixture();
  const result = await recoverAbandonedQris(f.db, { apply: true, verify: f.verify });
  assert.equal(result.state, "recovered");
  assert.equal(f.transaction.archived_at, null);
  assert.equal(f.transaction.payout_status, null);
  assert.equal(f.ledger.settlement_status, null);
  assert.equal(f.transaction.status, "paid");
  assert.equal(f.ledger.net_amount, 12909);
  assert.equal(f.ledger.gateway_fee_amount, 91);
  assert.equal(f.rows.transactions.length, 1);
  assert.equal(f.rows.payment_ledger_entries.length, 1);
  assert.equal(f.rows.payout_invoice_items.length, 0);
  assert.equal(f.writes[0].table, "admin_notifications");
  const audit = f.rows.admin_notifications[0].metadata;
  assert.equal(audit.state, "completed");
  assert.equal(audit.before.transaction.archive_reason, "abandoned");
  assert.equal(audit.before.ledger.settlement_status, "abandoned");
});

test("repeating a completed recovery performs no additional writes", async () => {
  const f = fixture();
  await recoverAbandonedQris(f.db, { apply: true, verify: f.verify });
  const count = f.writes.length;
  assert.equal((await recoverAbandonedQris(f.db, { apply: true, verify: f.verify })).state, "already_recovered");
  assert.equal(f.writes.length, count);
});

test("partial failure leaves an audit and can safely resume", async () => {
  const f = fixture();
  f.failLedger();
  await assert.rejects(recoverAbandonedQris(f.db, { apply: true, verify: f.verify }), /simulated ledger failure/);
  assert.equal(f.transaction.archived_at, null);
  assert.equal(f.ledger.settlement_status, "abandoned");
  assert.equal(f.rows.admin_notifications[0].metadata.state, "started");
  assert.equal((await recoverAbandonedQris(f.db, { apply: true, verify: f.verify })).state, "recovered");
  assert.equal(f.rows.admin_notifications.length, 1);
});

test("refunds, allocations, mismatches and unrelated archives stop before any writes", async () => {
  for (const change of [
    f => { f.transaction.provider = "Cash"; },
    f => { f.transaction.status = "refunded"; },
    f => { f.transaction.organization_id = "other-org"; },
    f => { f.transaction.archive_reason = "Approved archive"; },
    f => { f.ledger.net_amount = 13000; },
    f => { f.ledger.payout_invoice_id = "invoice-1"; },
    f => { f.ledger.gateway_settlement_status = "pending"; },
    f => { f.rows.transaction_action_requests.push({ id: "refund-1", transaction_id: f.transaction.id, action: "refund", status: "approved" }); },
    f => { f.rows.payout_invoice_items.push({ id: "allocation-1", ledger_entry_id: f.ledger.id }); },
  ]) {
    const f = fixture();
    change(f);
    await assert.rejects(recoverAbandonedQris(f.db, { apply: true, verify: f.verify }));
    assert.equal(f.writes.length, 0);
  }
});

test("gateway must confirm exact successful order, amount and reference", async () => {
  for (const patch of [{ statusCode: "01" }, { amount: 12000 }, { reference: "other-reference" }, { merchantOrderId: "other-order" }]) {
    const f = fixture();
    await assert.rejects(recoverAbandonedQris(f.db, { apply: true, verify: async () => ({ ...await f.verify(), ...patch }) }));
    assert.equal(f.writes.length, 0);
  }
});
