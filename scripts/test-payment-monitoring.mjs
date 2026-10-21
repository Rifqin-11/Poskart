// Read-only mocked tests: node --test scripts/test-payment-monitoring.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const filters = { page: 1, organizationId: "", status: "", search: "", from: "", to: "" };
const transaction = {
  id: "tx-1", organization_id: "org-1", merchant_order_id: "PK123", payment_reference: "ref-1",
  collection_mode: "platform", status: "paid", amount: 13000, created_at: "2026-10-17T13:15:00Z",
  paid_at: "2026-10-17T13:16:00Z", gateway_status_checked_at: null, duitku_status_code: "00",
};

function fixture({ denied = false, transactions = [transaction], ledgers = [], failure = null } = {}) {
  const calls = [];
  const source = readFileSync(new URL("../server/admin/actions/payment-monitoring-actions.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const testModule = { exports: {} };
  const mocks = {
    "@/server/admin/context": { requireSuperAdmin: async () => { calls.push(["auth"]); if (denied) throw new Error("Forbidden"); } },
    "@/lib/supabase/admin": { createSupabaseAdminClient: () => {
      calls.push(["client"]);
      return { from(table) {
        calls.push(["from", table]);
        const query = {};
        for (const method of ["select", "eq", "not", "or", "gte", "lt", "order", "range", "in"]) {
          query[method] = (...args) => { calls.push([method, ...args]); return query; };
        }
        query.then = resolve => resolve({
          data: table === "transactions" ? transactions : table === "payment_ledger_entries" ? ledgers : [],
          count: transactions.length, error: failure === table ? { message: "Database failed" } : null,
        });
        return query;
      } };
    } },
  };
  new Function("exports", "require", "module", compiled)(testModule.exports, name => {
    if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`);
    return mocks[name];
  }, testModule);
  return { calls, load: input => testModule.exports.getPaymentMonitoring({ ...filters, ...input }) };
}

test("non-superadmin cannot create a cross-organization client", async () => {
  const f = fixture({ denied: true });
  await assert.rejects(f.load(), /Forbidden/);
  assert.deepEqual(f.calls, [["auth"]]);
});

test("paid platform payment without ledger is flagged, custom gateway is not", async () => {
  const f = fixture({ transactions: [transaction, { ...transaction, id: "tx-2", collection_mode: "custom" }] });
  const result = await f.load();
  assert.deepEqual(result.items[0].warnings, ["Paid tanpa ledger"]);
  assert.deepEqual(result.items[1].warnings, []);
  assert.equal(result.items[0].ledger, null);
});

test("identity, amount and reference discrepancies are visible", async () => {
  const f = fixture({ ledgers: [{ id: "ledger-1", merchant_order_id: "PK123", organization_id: "wrong-org", transaction_id: "wrong-tx",
    duitku_reference: "wrong-ref", gross_amount: 10000, gateway_fee_amount: 70, net_amount: 9930, status: "paid", settlement_status: null }] });
  const result = await f.load();
  assert.equal(result.items[0].warnings.length, 3);
});

test("organization/status/date/search filters and pagination remain server-side", async () => {
  const f = fixture();
  await f.load({ page: 2, organizationId: "org-1", status: "paid", from: "2026-10-17", to: "2026-10-17", search: "PK123" });
  for (const expected of [["eq", "provider", "QRIS"], ["eq", "payment_gateway", "duitku"], ["eq", "organization_id", "org-1"],
    ["eq", "status", "paid"], ["gte", "created_at", "2026-10-17T00:00:00+07:00"], ["lt", "created_at", "2026-10-17T17:00:00.000Z"], ["range", 25, 49]]) {
    assert.ok(f.calls.some(call => JSON.stringify(call) === JSON.stringify(expected)), JSON.stringify(expected));
  }
  assert.equal(f.calls[0][0], "auth");
});

test("invalid search, status, dates and inverted ranges are rejected", async () => {
  for (const input of [{ search: "x),status.eq.paid" }, { status: "forged" }, { from: "2026-02-30" }, { from: "2026-10-18", to: "2026-10-17" }]) {
    await assert.rejects(fixture().load(input));
  }
});

test("database failures do not appear as an empty success", async () => {
  await assert.rejects(fixture({ failure: "transactions" }).load(), /tidak dapat dimuat/);
  await assert.rejects(fixture({ failure: "payment_ledger_entries" }).load(), /tidak dapat dimuat/);
});
