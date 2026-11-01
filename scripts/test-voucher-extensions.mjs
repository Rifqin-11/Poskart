// Run: node --test scripts/test-voucher-extensions.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function load(path, mocks = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const compiledModule = { exports: {} };
  new Function("exports", "require", "module", compiled)(
    compiledModule.exports,
    (id) => mocks[id] ?? {},
    compiledModule,
  );
  return compiledModule.exports;
}

function harness({ data = "2027-01-01T00:00:00.000Z", error = null } = {}) {
  const calls = [];
  const actions = load("server/admin/actions/voucher-actions.ts", {
    "@/server/admin/context": {
      verifyRole: async () => ({
        supabase: {
          rpc: async (name, args) => {
            calls.push({ name, args });
            return { data, error };
          },
        },
      }),
    },
  });
  return { actions, calls };
}

test("voucher campaigns accept 90 days at creation", () => {
  const source = readFileSync(new URL("../server/admin/actions/voucher-actions.ts", import.meta.url), "utf8");
  assert.match(source, /\[1, 3, 7, 14, 30, 90\]/);
  assert.match(readFileSync(new URL("../features/admin/vouchers/voucher-management.tsx", import.meta.url), "utf8"), /<option value="90">90 hari<\/option>/);
});

test("campaign extension uses the atomic RPC for 30 and 90 days", async () => {
  for (const days of [30, 90]) {
    const h = harness();
    assert.deepEqual(await h.actions.extendVoucherCampaign("campaign-1", days), {
      expiresAt: "2027-01-01T00:00:00.000Z",
    });
    assert.deepEqual(h.calls, [{
      name: "extend_voucher_campaign",
      args: { p_campaign_id: "campaign-1", p_extension_days: days },
    }]);
  }
});

test("invalid extension values never reach the database", async () => {
  const h = harness();
  await assert.rejects(h.actions.extendVoucherCampaign("campaign-1", 31), /30 or 90/);
  assert.equal(h.calls.length, 0);
});

test("database errors and missing campaigns fail closed", async () => {
  const failed = harness({ error: { message: "campaign not found" } });
  await assert.rejects(failed.actions.extendVoucherCampaign("campaign-1", 30), /campaign not found/);
  const missing = harness({ data: null });
  await assert.rejects(missing.actions.extendVoucherCampaign("campaign-1", 30), /not found/);
});

test("migration locks the campaign and extends expired campaigns from now", () => {
  const source = readFileSync(new URL("../supabase/migrations/20261101090000_extend_voucher_campaigns.sql", import.meta.url), "utf8");
  assert.match(source, /for update/i);
  assert.match(source, /greatest\(coalesce\(current_expiry, now\(\)\), now\(\)\)/i);
  assert.match(source, /p_extension_days not in \(30, 90\)/i);
});
