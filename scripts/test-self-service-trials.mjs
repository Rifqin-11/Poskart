// Run: node --test scripts/test-self-service-trials.mjs (no database access).
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
  new Function("exports", "require", "module", compiled)(compiledModule.exports, id => mocks[id] ?? {}, compiledModule);
  return compiledModule.exports;
}

function harness({
  role = "owner", adminRole = "user", rateAllowed = true, rateError = null,
  rpcError = null, result = { request_id: "request-1", auto_rejected: false, rejection_code: null, already_active: false },
} = {}) {
  const calls = [];
  const paths = [];
  const notifications = [];
  const filters = [];
  const query = {
    select() { return query; },
    eq(key, value) { filters.push([key, value]); return query; },
    order() { return query; }, limit() { return query; },
    async maybeSingle() { return { data: role === "owner" ? { organization_id: "org-1" } : null, error: null }; },
    async single() { return { data: { request_id: "request-1" }, error: null }; },
  };
  const supabase = {
    from() { return query; },
    async rpc(name, args) { calls.push({ name, args }); return { data: result, error: rpcError }; },
  };
  const actions = load("server/admin/actions/trial-actions.ts", {
    "@/server/admin/context": {
      getAdminContext: async () => ({ supabase, user: { id: "user-1" } }),
      getAdminProfileRole: async () => adminRole,
    },
    "@/lib/supabase/admin": {
      createSupabaseAdminClient: () => ({ rpc: async () => ({ data: rateAllowed, error: rateError }) }),
    },
    "@/lib/supabase/server": { getServiceRoleClient: async () => supabase },
    "@/server/admin/notifications": { createAdminNotification: async (_, notification) => notifications.push(notification) },
    "next/cache": { revalidatePath: path => paths.push(path) },
  });
  return { actions, calls, paths, notifications, filters };
}

test("starting a trial uses authenticated RPC, refreshes access, and sends welcome notification", async () => {
  const h = harness({});
  assert.deepEqual(await h.actions.submitTrialRequest(), {
    requestId: "request-1", autoRejected: false, rejectionCode: null, alreadyActive: false,
  });
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].name, "submit_trial_request");
  assert.equal(h.calls[0].args.p_organization_id, "org-1");
  assert.ok(!("p_email" in h.calls[0].args));
  assert.deepEqual(h.paths, ["/dashboard", "/trial"]);
  assert.equal(h.notifications[0].type, "trial_activated");
});

test("idempotent retries do not send duplicate welcome notifications", async () => {
  const h = harness({ result: { request_id: "request-1", auto_rejected: false, rejection_code: null, already_active: true } });
  assert.equal((await h.actions.submitTrialRequest()).alreadyActive, true);
  assert.equal(h.notifications.length, 0);
});

test("ineligible identities receive the database reason, not a successful activation", async () => {
  for (const code of ["duplicate_organization", "duplicate_email", "duplicate_owner", "email_unverified", "subscription_exists"]) {
    const h = harness({ result: { request_id: null, auto_rejected: true, rejection_code: code, already_active: false } });
    const result = await h.actions.submitTrialRequest();
    assert.equal(result.autoRejected, true);
    assert.equal(result.rejectionCode, code);
    assert.equal(h.paths.length, 0);
    assert.equal(h.notifications.length, 0);
  }
});

test("rate limit denials and failures fail closed before starting a trial", async () => {
  for (const input of [{ rateAllowed: false }, { rateError: { message: "offline" } }]) {
    const h = harness(input);
    await assert.rejects(h.actions.submitTrialRequest(), /Terlalu banyak|belum dapat diproses/);
    assert.equal(h.calls.length, 0);
  }
});

test("non-owners cannot submit and database errors do not claim success", async () => {
  const member = harness({ role: "admin" });
  await assert.rejects(member.actions.submitTrialRequest(), /Hanya pemilik/);
  assert.equal(member.calls.length, 0);
  const offline = harness({ rpcError: { message: "offline" } });
  await assert.rejects(offline.actions.submitTrialRequest(), /Gagal memulai trial/);
  assert.equal(offline.paths.length, 0);
  assert.equal(offline.notifications.length, 0);
});

test("revocation requires superadmin and a valid reason before the atomic RPC", async () => {
  const member = harness({});
  await assert.rejects(member.actions.revokeTrialByRequestId("request-1", "Abuse detected"), /Akses ditolak/);
  assert.equal(member.calls.length, 0);
  const admin = harness({ adminRole: "admin" });
  for (const reason of [" ", "abcd", "x".repeat(1001)]) {
    await assert.rejects(admin.actions.revokeTrialByRequestId("request-1", reason), /5–1000/);
  }
  assert.equal(admin.calls.length, 0);
  await admin.actions.revokeTrialByRequestId("request-1", "  Repeated abuse  ");
  assert.deepEqual(admin.calls, [{ name: "revoke_trial", args: { p_request_id: "request-1", p_reason: "Repeated abuse" } }]);
  assert.deepEqual(admin.paths, ["/dashboard", "/trial"]);
});

test("both revocation entry points use the same atomic RPC and preserve errors", async () => {
  const h = harness({ adminRole: "admin" });
  await h.actions.revokeTrialClaim("claim-1", "Abuse detected");
  assert.equal(h.calls[0].name, "revoke_trial");
  const failed = harness({ adminRole: "admin", rpcError: { message: "Paid subscription" } });
  await assert.rejects(failed.actions.revokeTrialByRequestId("request-1", "Abuse detected"), /Paid subscription/);
  assert.equal(failed.paths.length, 0);
});

test("legacy review cannot approve or mutate trials", async () => {
  const h = harness({ adminRole: "admin" });
  await assert.rejects(h.actions.reviewTrialRequest({ requestId: "request-1", decision: "approved" }), /tidak lagi memerlukan review/);
  assert.equal(h.calls.length, 0);
});

test("non-owners receive an unavailable eligibility state without querying trial history", async () => {
  const h = harness({ role: "admin" });
  const result = await h.actions.getMyTrialEligibility();
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "not_owner");
  assert.equal(h.calls.length, 0);
});

test("eligibility maps server time and lifecycle details for consistent UI", async () => {
  const h = harness({ result: { checked_at: "2026-10-22T00:00:00Z", eligible: false,
    reason: "duplicate_organization", claim_status: "revoked", ends_at: "2026-11-01T00:00:00Z", revoke_reason: "Abuse detected" } });
  const result = await h.actions.getMyTrialEligibility();
  assert.equal(result.checkedAt, "2026-10-22T00:00:00Z");
  assert.equal(result.claimStatus, "revoked");
  assert.equal(result.revokeReason, "Abuse detected");
});

test("messages distinguish spent email/organization allowances, expiry, and revocation", () => {
  const policy = load("lib/trial-policy.ts");
  assert.match(policy.trialUnavailableMessage("duplicate_email"), /Email ini sudah pernah/);
  assert.match(policy.trialUnavailableMessage("duplicate_organization"), /Organisasi ini sudah pernah/);
  assert.equal(policy.trialEligibilityTitle({ claimStatus: "expired" }), "Trial telah berakhir");
  assert.equal(policy.trialEligibilityTitle({ claimStatus: "revoked" }), "Trial dibatalkan");
});
