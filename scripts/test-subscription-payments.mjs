// Run: node --test scripts/test-subscription-payments.mjs
// Optional real SQL tests: set POSKART_PGLITE_MODULE to an externally installed
// @electric-sql/pglite package directory. No production database is accessed.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = new URL("../", import.meta.url);

function loadTs(path, overrides = {}, globals = {}) {
  const source = readFileSync(new URL(path, root), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const testModule = { exports: {} };
  const localRequire = (id) => id in overrides ? overrides[id] : require(id);
  new Function("exports", "require", "module", "fetch", "process", compiled)(
    testModule.exports, localRequire, testModule, globals.fetch ?? fetch, globals.process ?? process,
  );
  return testModule.exports;
}

const types = loadTs("features/billing/subscription/payment-types.ts");
const midtrans = loadTs("server/payments/midtrans.ts");
const order = {
  merchant_order_id: "ORDER-1", plan_name: "Starter", amount: 150000,
  duration_months: 1, device_count: 1, status: "pending", payment_gateway: "duitku",
  payment_url: "https://app-prod.duitku.com/payment/1", created_at: "2026-10-13T00:00:00Z",
  gateway_status_checked_at: null, subscription_activated_at: null,
};

test("resume only pending payments on trusted HTTPS gateway domains", () => {
  assert.equal(types.getSubscriptionPaymentUrl(order), order.payment_url);
  for (const payment_url of ["javascript:alert(1)", "http://duitku.com/payment", "https://duitku.com.evil.test", "https://evilduitku.com", "bad-url"]) {
    assert.equal(types.getSubscriptionPaymentUrl({ ...order, payment_url }), null);
  }
  assert.equal(types.getSubscriptionPaymentUrl({ ...order, status: "paid" }), null);
  assert.equal(types.getSubscriptionPaymentUrl({ ...order, status: "failed" }), null);
  assert.equal(types.getSubscriptionPaymentUrl({ ...order, payment_gateway: "midtrans", payment_url: "https://app.midtrans.com/snap/1" }), "https://app.midtrans.com/snap/1");
});

test("Midtrans settlement and accepted capture are paid; fraud challenge is not", () => {
  assert.equal(midtrans.mapMidtransTransactionStatus({ transaction_status: "settlement" }), "paid");
  assert.equal(midtrans.mapMidtransTransactionStatus({ transaction_status: "capture", fraud_status: "accept" }), "paid");
  assert.equal(midtrans.mapMidtransTransactionStatus({ transaction_status: "capture", fraud_status: "challenge" }), "pending");
  assert.equal(midtrans.mapMidtransTransactionStatus({ transaction_status: "capture" }), "pending");
  for (const transaction_status of ["deny", "expire", "cancel", "failure"]) {
    assert.equal(midtrans.mapMidtransTransactionStatus({ transaction_status }), "failed");
  }
});

test("Midtrans status uses server authentication and sandbox endpoint", async () => {
  const provider = loadTs("server/payments/midtrans.ts", {}, {
    process: { env: { MIDTRANS_MERCHANT_ID: "test", NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: "client", MIDTRANS_SERVER_KEY: "server" } },
    fetch: async (url, options) => {
      assert.equal(url, "https://api.sandbox.midtrans.com/v2/ORDER%2F1/status");
      assert.equal(options.headers.Authorization, `Basic ${Buffer.from("server:").toString("base64")}`);
      assert.equal(options.cache, "no-store");
      assert.ok(options.signal instanceof AbortSignal);
      return Response.json({ order_id: "ORDER/1", transaction_status: "pending", gross_amount: "150000.00", status_code: "201" });
    },
  });
  assert.equal((await provider.checkMidtransTransactionStatus("ORDER/1")).transaction_status, "pending");
});

test("Midtrans unrecognized order is an error, not a payment failure", async () => {
  const provider = loadTs("server/payments/midtrans.ts", {}, {
    process: { env: { MIDTRANS_MERCHANT_ID: "test", NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: "client", MIDTRANS_SERVER_KEY: "server" } },
    fetch: async () => Response.json({ status_code: "404", status_message: "Not found" }),
  });
  await assert.rejects(provider.checkMidtransTransactionStatus("ORDER-1"));
});

function reconciliationHarness({ claim = true, providerResult, providerError, storedOrder = order, rpcError } = {}) {
  const calls = [];
  const rpcCalls = [];
  let current = { ...storedOrder };
  const supabase = {
    from(table) {
      calls.push(["from", table]);
      const builder = {
        update(value) { calls.push(["update", value]); return this; },
        eq(...args) { calls.push(["eq", ...args]); return this; },
        neq(...args) { calls.push(["neq", ...args]); return this; },
        or(value) { calls.push(["or", value]); return this; },
        select() { return this; },
        async maybeSingle() { return { data: claim ? { merchant_order_id: order.merchant_order_id } : null, error: null }; },
        async single() { return { data: current, error: null }; },
      };
      return builder;
    },
    async rpc(name, input) {
      rpcCalls.push({ name, input });
      if (!rpcError) current = { ...current, status: input.p_status, gateway_status_checked_at: input.p_checked_at };
      return { error: rpcError ? { message: rpcError } : null };
    },
  };
  const reconciliation = loadTs("server/subscription/payment-reconciliation.ts", {
    "@/server/payments/duitku": {
      checkDuitkuTransactionStatus: async () => {
        if (providerError) throw new Error(providerError);
        return providerResult ?? { merchantOrderId: "ORDER-1", statusCode: "00", amount: 150000, raw: {} };
      },
      mapDuitkuTransactionStatusCode: (code) => code === "00" ? "paid" : code === "02" ? "failed" : "pending",
    },
    "@/server/payments/midtrans": {
      checkMidtransTransactionStatus: async () => providerResult,
      mapMidtransTransactionStatus: midtrans.mapMidtransTransactionStatus,
    },
  });
  return { ...reconciliation, supabase, calls, rpcCalls };
}

test("paid orders skip gateway checks and activation", async () => {
  const harness = reconciliationHarness();
  const paid = { ...order, status: "paid" };
  assert.equal(await harness.refreshSubscriptionPayment(harness.supabase, paid, "org-1"), paid);
  assert.equal(harness.calls.length, 0);
  assert.equal(harness.rpcCalls.length, 0);
});

test("gateway success uses one atomic RPC and organization-scoped cooldown", async () => {
  const harness = reconciliationHarness();
  const result = await harness.refreshSubscriptionPayment(harness.supabase, order, "org-1");
  assert.equal(result.status, "paid");
  assert.equal(harness.rpcCalls.length, 1);
  assert.equal(harness.rpcCalls[0].name, "reconcile_subscription_payment");
  assert.equal(harness.rpcCalls[0].input.p_status, "paid");
  assert.ok(harness.calls.some((call) => call[0] === "eq" && call[1] === "organization_id" && call[2] === "org-1"));
  assert.ok(harness.calls.some((call) => call[0] === "or" && call[1].includes("gateway_status_check_started_at.lt.")));
});

test("another checker owns cooldown: reload status without second activation", async () => {
  const harness = reconciliationHarness({ claim: false, storedOrder: { ...order, status: "paid" } });
  assert.equal((await harness.refreshSubscriptionPayment(harness.supabase, order, "org-1")).status, "paid");
  assert.equal(harness.rpcCalls.length, 0);
});

test("Duitku refuses wrong order, wrong amount, missing paid amount and unknown status", async () => {
  for (const providerResult of [
    { merchantOrderId: "OTHER", statusCode: "00", amount: 150000 },
    { merchantOrderId: "ORDER-1", statusCode: "00", amount: 1 },
    { merchantOrderId: "ORDER-1", statusCode: "00" },
    { merchantOrderId: "ORDER-1", statusCode: "99", amount: 150000 },
  ]) {
    const harness = reconciliationHarness({ providerResult });
    await assert.rejects(harness.refreshSubscriptionPayment(harness.supabase, order, "org-1"));
    assert.equal(harness.rpcCalls.length, 0);
  }
});

test("gateway outages do not change pending payment status", async () => {
  const harness = reconciliationHarness({ providerError: "Gateway timeout" });
  await assert.rejects(harness.refreshSubscriptionPayment(harness.supabase, order, "org-1"), /Gateway timeout/);
  assert.equal(harness.rpcCalls.length, 0);
});

test("Midtrans validates amount before activation", async () => {
  const harness = reconciliationHarness({ providerResult: { order_id: "ORDER-1", transaction_status: "settlement", gross_amount: "1" } });
  await assert.rejects(harness.refreshSubscriptionPayment(harness.supabase, { ...order, payment_gateway: "midtrans" }, "org-1"));
  assert.equal(harness.rpcCalls.length, 0);
});

test("activation failure is propagated, not displayed as successful payment", async () => {
  const harness = reconciliationHarness({ rpcError: "Activation failed" });
  await assert.rejects(harness.refreshSubscriptionPayment(harness.supabase, order, "org-1"), /Activation failed/);
});

test("payment API requires authentication and rejects cross-origin checks", async () => {
  let serviceAccessed = false;
  const route = loadTs("app/api/subscription/payments/route.ts", {
    "next/server": { NextResponse: { json: (body, options) => Response.json(body, options) } },
    "@/lib/supabase/server": { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null }, error: null }) } }) },
    "@/lib/supabase/admin": { createSupabaseAdminClient: () => { serviceAccessed = true; } },
    "@/server/subscription/payment-reconciliation": {},
  });
  const request = new Request("https://poskart.test/api/subscription/payments");
  request.nextUrl = new URL(request.url);
  assert.equal((await route.GET(request)).status, 401);
  const crossOrigin = new Request(request.url, { method: "POST", headers: { origin: "https://evil.test" } });
  crossOrigin.nextUrl = new URL(crossOrigin.url);
  assert.equal((await route.POST(crossOrigin)).status, 403);
  assert.equal(serviceAccessed, false);
});

test("payment checks cannot access orders outside the authenticated organization", async () => {
  const filters = [];
  let gatewayChecked = false;
  const membershipBuilder = {
    select() { return this; }, eq() { return this; }, limit() { return this; },
    async maybeSingle() { return { data: { organization_id: "my-org" }, error: null }; },
  };
  const orderBuilder = {
    select() { return this; },
    eq(...args) { filters.push(args); return this; },
    async maybeSingle() { return { data: null, error: null }; },
  };
  const route = loadTs("app/api/subscription/payments/route.ts", {
    "next/server": { NextResponse: { json: (body, options) => Response.json(body, options) } },
    "@/lib/supabase/server": { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) }, from: () => membershipBuilder }) },
    "@/lib/supabase/admin": { createSupabaseAdminClient: () => ({ from: () => orderBuilder }) },
    "@/server/subscription/payment-reconciliation": { refreshSubscriptionPayment: () => { gatewayChecked = true; } },
  });
  const request = new Request("https://poskart.test/api/subscription/payments", {
    method: "POST", headers: { origin: "https://poskart.test", "Content-Type": "application/json" }, body: JSON.stringify({ order: "someone-elses-order" }),
  });
  request.nextUrl = new URL(request.url);
  assert.equal((await route.POST(request)).status, 404);
  assert.ok(filters.some(([column, value]) => column === "organization_id" && value === "my-org"));
  assert.equal(gatewayChecked, false);
});

test("SQL transaction: idempotency, additive renewals, rollback and service-role-only access", {
  skip: !process.env.POSKART_PGLITE_MODULE,
}, async () => {
  const { PGlite } = require(process.env.POSKART_PGLITE_MODULE);
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create table organizations (id text primary key);
      create table profiles (id uuid primary key, email text);
      create table organization_members (organization_id text, profile_id uuid);
      create table subscription_plans (id text primary key);
      create table subscription_orders (
        id uuid primary key default gen_random_uuid(), merchant_order_id text unique,
        organization_id text, profile_id uuid, email text, plan_id text,
        status text default 'pending', duration_months integer, device_count integer,
        payment_reference text, payment_method text, gateway_response jsonb,
        created_at timestamptz default now(), updated_at timestamptz default now()
      );
      create table subscriptions (
        organization_id text primary key references organizations(id),
        plan_id text references subscription_plans(id), status text,
        current_period_end timestamptz, device_limit integer, updated_at timestamptz
      );
      create table admin_notifications (organization_id text, type text);
      insert into organizations values ('org-1');
      insert into subscription_plans values ('starter');
      insert into subscriptions values ('org-1', 'starter', 'active', now() + interval '7 days', 1, now());
      insert into admin_notifications values ('org-1', 'subscription_expiry_reminder');
      insert into subscription_orders (merchant_order_id, organization_id, plan_id, duration_months, device_count)
        values ('SQL-1', 'org-1', 'starter', 1, 1), ('SQL-2', 'org-1', 'starter', 1, 1), ('SQL-BAD', 'org-1', 'missing-plan', 1, 1);
    `);
    await db.exec(readFileSync(new URL("supabase/migrations/20261013080000_atomic_subscription_payment_reconciliation.sql", root), "utf8"));
    const expiry = async () => (await db.query("select current_period_end::text as value from subscriptions where organization_id = 'org-1'")).rows[0].value;
    const initial = await expiry();
    const reconcile = (id, status = "paid") => db.query("select reconcile_subscription_payment($1, $2, null, null, '{}'::jsonb, now())", [id, status]);
    await reconcile("SQL-1", "pending");
    assert.equal(await expiry(), initial);
    await reconcile("SQL-1");
    const firstExpiry = await expiry();
    const expectedFirst = (await db.query("select ($1::timestamptz + interval '1 month')::text as value", [initial])).rows[0].value;
    assert.equal(firstExpiry, expectedFirst);
    await reconcile("SQL-1");
    await reconcile("SQL-1", "failed");
    assert.equal(await expiry(), firstExpiry);
    assert.equal((await db.query("select status from subscription_orders where merchant_order_id = 'SQL-1'")).rows[0].status, "paid");
    assert.ok((await db.query("select subscription_activated_at from subscription_orders where merchant_order_id = 'SQL-1'")).rows[0].subscription_activated_at);
    await reconcile("SQL-2");
    const secondExpiry = await expiry();
    assert.equal(secondExpiry, (await db.query("select ($1::timestamptz + interval '1 month')::text as value", [firstExpiry])).rows[0].value);
    await assert.rejects(reconcile("SQL-BAD"));
    assert.equal(await expiry(), secondExpiry);
    assert.equal((await db.query("select status from subscription_orders where merchant_order_id = 'SQL-BAD'")).rows[0].status, "pending");
    assert.equal((await db.query("select count(*)::int as count from admin_notifications")).rows[0].count, 0);
    const signature = "reconcile_subscription_payment(text,text,text,text,jsonb,timestamp with time zone)";
    assert.equal((await db.query("select has_function_privilege('authenticated', $1, 'EXECUTE') as allowed", [signature])).rows[0].allowed, false);
    assert.equal((await db.query("select has_function_privilege('service_role', $1, 'EXECUTE') as allowed", [signature])).rows[0].allowed, true);

    // Calendar-month clamping must match the checkout preview, including leap years.
    let leapYear = new Date().getUTCFullYear() + 1;
    while (leapYear % 4 !== 0 || (leapYear % 100 === 0 && leapYear % 400 !== 0)) leapYear++;
    await db.exec(`
      insert into organizations values ('org-leap'), ('org-expired');
      insert into subscriptions values ('org-leap', 'starter', 'active', '${leapYear}-01-31 00:00:00+00', 1, now());
      insert into subscriptions values ('org-expired', 'starter', 'past_due', now() - interval '7 days', 1, now());
      insert into subscription_orders (merchant_order_id, organization_id, plan_id, duration_months, device_count)
        values ('SQL-LEAP', 'org-leap', 'starter', 1, 1), ('SQL-EXPIRED', 'org-expired', 'starter', 1, 1);
    `);
    await reconcile("SQL-LEAP");
    assert.equal(new Date((await db.query("select current_period_end from subscriptions where organization_id = 'org-leap'")).rows[0].current_period_end).toISOString(), `${leapYear}-02-29T00:00:00.000Z`);
    await reconcile("SQL-EXPIRED");
    assert.equal((await db.query("select current_period_end > now() + interval '27 days' as renewed from subscriptions where organization_id = 'org-expired'")).rows[0].renewed, true);
  } finally { await db.close(); }
});
