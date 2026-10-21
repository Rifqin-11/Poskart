// Run: node --test scripts/test-qris-session-abandon.mjs (no database access).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function fixture({ provider = "QRIS", status = "paid", invoiceId = null, organizationId = "org-1", ledgerError = null } = {}) {
  const transaction = { id: "session-1", provider, status, organization_id: organizationId,
    payout_invoice_id: invoiceId, archived_at: null, archive_reason: null, payout_status: null };
  const ledger = { settlement_status: null };
  const calls = [];
  function from(table) {
    const filters = [];
    let patch;
    const query = {
      update(value) { patch = value; calls.push({ table, patch }); return query; },
      eq(key, value) { filters.push(row => row[key] === value); return query; },
      or(expression) {
        assert.equal(expression, "provider.is.null,provider.neq.QRIS");
        filters.push(row => row.provider == null || row.provider !== "QRIS");
        return query;
      },
      is(key, value) {
        filters.push(row => row[key] === value);
        if (table === "payment_ledger_entries") {
          if (!ledgerError) Object.assign(ledger, patch);
          return Promise.resolve({ error: ledgerError });
        }
        return query;
      },
      select() { return query; },
      async maybeSingle() {
        if (!filters.every(filter => filter(transaction))) return { data: null, error: null };
        Object.assign(transaction, patch);
        return { data: { id: transaction.id }, error: null };
      },
    };
    return query;
  }
  const source = readFileSync(new URL("../app/api/kiosk/transactions/route.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const testModule = { exports: {} };
  const mocks = {
    "@/lib/kiosk/server": {
      requireKioskContext: async () => ({ client: { from }, organizationId: "org-1", user: { id: "user-1" } }),
      requireOrganizationDevice: async () => ({ id: "device-1" }),
      jsonOk: (body, init) => Response.json(body, init),
      jsonError: error => Response.json({ error: error.message }, { status: 500 }),
    },
    "@/lib/supabase/admin": { createSupabaseAdminClient: () => ({ from }) },
  };
  new Function("exports", "require", "module", compiled)(testModule.exports, id => mocks[id] ?? {}, testModule);
  async function abandon(clientProvider = "Cash") {
    const response = await testModule.exports.POST(new Request("https://example.com/api/kiosk/transactions", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "abandon", deviceId: "device-1", transaction: { id: "session-1", provider: clientProvider } }),
    }));
    return { status: response.status, body: await response.json() };
  }
  return { transaction, ledger, calls, abandon };
}

test("QRIS session abandon cannot archive transactions or exclude their money, for any payment state", async () => {
  for (const status of ["paid", "pending", "failed", "cancelled", "refunded"]) {
    const { transaction, ledger, calls, abandon } = fixture({ status });
    const before = structuredClone(transaction);
    // A forged/stale client payment method must not bypass the database filter.
    const result = await abandon("Cash");
    assert.equal(result.status, 200);
    assert.equal(result.body.abandoned, false);
    assert.deepEqual(transaction, before);
    assert.equal(ledger.settlement_status, null);
    assert.equal(calls.some(call => call.table === "payment_ledger_entries"), false);
  }
});

test("repeated offline abandonment requests remain harmless for QRIS", async () => {
  const { transaction, ledger, abandon } = fixture();
  for (let i = 0; i < 3; i++) assert.equal((await abandon()).body.abandoned, false);
  assert.equal(transaction.status, "paid");
  assert.equal(transaction.archived_at, null);
  assert.equal(ledger.settlement_status, null);
});

test("Cash, Voucher, Event and legacy unspecified providers retain existing abandonment behavior", async () => {
  for (const provider of ["Cash", "Voucher", "Event", null]) {
    const { transaction, ledger, abandon } = fixture({ provider });
    assert.equal((await abandon("QRIS")).body.abandoned, true);
    assert.equal(transaction.archive_reason, "abandoned");
    assert.equal(transaction.payout_status, "abandoned");
    assert.equal(ledger.settlement_status, "abandoned");
  }
});

test("other organizations and allocated transactions still cannot be archived", async () => {
  for (const options of [{ provider: "Cash", organizationId: "other-org" }, { provider: "Cash", invoiceId: "invoice-1" }]) {
    const { transaction, ledger, abandon } = fixture(options);
    assert.equal((await abandon()).body.abandoned, false);
    assert.equal(transaction.archived_at, null);
    assert.equal(ledger.settlement_status, null);
  }
});

test("non-QRIS ledger failures are still reported", async () => {
  const { abandon } = fixture({ provider: "Cash", ledgerError: new Error("ledger failed") });
  assert.equal((await abandon()).status, 500);
});
