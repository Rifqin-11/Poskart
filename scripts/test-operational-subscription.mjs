// Run: node --test scripts/test-operational-subscription.mjs (no database access).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function load(path, mocks = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "require", "module", compiled)(module.exports, id => mocks[id] ?? {}, module);
  return module.exports;
}

const policy = load("lib/subscription-policy.ts");
const { requireOperationalSubscription } = load("server/subscription/operational-access.ts", {
  "@/lib/subscription-policy": policy,
});
const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

function client(data, error = null) {
  const query = {
    select() { return query; },
    eq(key, value) { assert.equal(key, "organization_id"); assert.equal(value, "org-1"); return query; },
    async maybeSingle() { return { data, error }; },
  };
  return { from(table) { assert.equal(table, "subscriptions"); return query; } };
}

test("active and trialing subscriptions with a future expiry can operate", async () => {
  for (const status of ["active", "trialing"]) {
    await requireOperationalSubscription(client({ status, current_period_end: future }), "org-1");
  }
});

test("free, missing, expired, canceled, past-due, and malformed subscriptions cannot operate", async () => {
  for (const subscription of [
    null,
    ...["free", "expired", "canceled", "past_due", "unknown"].map(status => ({ status, current_period_end: future })),
    { status: "active", current_period_end: past },
    { status: "trialing", current_period_end: past },
    { status: "active", current_period_end: null },
    { status: "active", current_period_end: "invalid" },
  ]) {
    await assert.rejects(requireOperationalSubscription(client(subscription), "org-1"), /Belum ada subscription aktif/);
  }
});

test("subscription lookup failures fail closed", async () => {
  await assert.rejects(requireOperationalSubscription(client(null, { message: "offline" }), "org-1"), /belum dapat diverifikasi/);
});

const denied = async () => { throw new Error("subscription-required"); };
const context = {
  verifyRole: async () => ({ supabase: {}, user: { id: "user-1" }, organizationId: "org-1" }),
};

test("both Cash and QRIS creation reject before accessing a gateway or writing transactions", async () => {
  const actions = load("server/admin/actions/transaction-actions.ts", {
    "@/server/admin/context": context,
    "@/server/subscription/operational-access": { requireOperationalSubscription: denied },
  });
  for (const paymentMethod of ["Cash", "QRIS"]) {
    await assert.rejects(actions.createAdminQrisTransaction({ productName: "Test", amount: 1000, paymentMethod }), /subscription-required/);
  }
});

test("both pairing actions reject before claiming a code or creating a device", async () => {
  const actions = load("server/admin/actions/device-actions.ts", {
    "@/server/admin/context": context,
    "@/server/subscription/operational-access": { requireOperationalSubscription: denied },
  });
  await assert.rejects(actions.validateDevicePairingCode("AB12CD34"), /subscription-required/);
  await assert.rejects(actions.createPairedDevice("pairing-1", {}), /subscription-required/);
});

test("POS creation returns the subscription error before writing a sale", async () => {
  const actions = load("app/(admin)/pos/actions.ts", {
    "@/server/admin/context": {
      getAdminContext: async () => ({ supabase: {}, user: { id: "user-1" } }),
      getAdminMembership: async () => ({ organizationId: "org-1" }),
    },
    "@/server/admin/organization-feature-access": { hasOrganizationFeatureAccess: async () => true },
    "@/server/subscription/operational-access": { requireOperationalSubscription: denied },
  });
  for (const paymentMethod of ["Cash", "QRIS"]) {
    const form = new FormData();
    form.set("paymentMethod", paymentMethod);
    assert.deepEqual(await actions.createPosSale(form), { success: false, error: "subscription-required" });
  }
});

test("free members can explore admin routes without a subscription lookup", async () => {
  const membership = { organizationId: "org-1" };
  const guards = load("server/admin/page-access.ts", {
    "@/server/admin/context": {
      getOptionalAdminContext: async () => ({}),
      getAdminMembership: async () => membership,
    },
    "next/navigation": { redirect: path => { throw new Error(`redirect:${path}`); } },
  });
  assert.deepEqual(await guards.requireOrganizationMembershipAccess(), membership);
});

test("kiosk operational guard rejects inactive accounts regardless of login type", async () => {
  const kiosk = load("lib/kiosk/server.ts", { "@/lib/subscription-policy": policy });
  for (const deviceTokenDeviceId of [null, "device-1"]) {
    const context = { client: client(null), organizationId: "org-1", deviceTokenDeviceId };
    await assert.rejects(kiosk.requireActiveKioskSubscription(context), error => error.code === "KIOSK_SUBSCRIPTION_INACTIVE");
    await assert.rejects(kiosk.buildKioskPairingSession(context), error => error.code === "KIOSK_SUBSCRIPTION_INACTIVE");
  }
});

test("kiosk operational guard accepts a valid subscription and rejects unverifiable expiry", async () => {
  const kiosk = load("lib/kiosk/server.ts", { "@/lib/subscription-policy": policy });
  await kiosk.requireActiveKioskSubscription({
    client: client({ status: "active", current_period_end: future }), organizationId: "org-1",
  });
  for (const current_period_end of [null, "invalid", past]) {
    await assert.rejects(kiosk.requireActiveKioskSubscription({
      client: client({ status: "active", current_period_end }), organizationId: "org-1",
    }), error => error.code === "KIOSK_SUBSCRIPTION_INACTIVE");
  }
});

test("device lease checks subscription so an already logged-in device gets locked", async () => {
  const route = load("app/api/kiosk/device/lease/route.ts", {
    "@/lib/kiosk/server": {
      requireKioskContext: async () => ({
        client: { from() { const query = {
          select() { return query; }, eq() { return query; },
          async maybeSingle() { return { data: { id: "device-1" }, error: null }; },
        }; return query; } },
        organizationId: "org-1",
      }),
      requireActiveKioskSubscription: denied,
      jsonError: error => ({ error: error.message }),
      jsonOk: value => value,
    },
  });
  assert.deepEqual(await route.GET(new Request("https://example.com/api/kiosk/device/lease?deviceId=device-1")), {
    error: "subscription-required",
  });
});
