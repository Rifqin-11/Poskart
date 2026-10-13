// Run: node --test scripts/test-subscription-payments.mjs
// Optional real SQL tests: set POSKART_PGLITE_MODULE to an externally installed
// @electric-sql/pglite package directory. No production database is accessed.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = new URL("../", import.meta.url);

function loadTs(path, overrides = {}, globals = {}) {
  const source = readFileSync(new URL(path, root), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const testModule = { exports: {} };
  const localRequire = (id) => id in overrides ? overrides[id]
    : id.startsWith("@/") ? loadTs(`${id.slice(2)}.ts`, overrides, globals) : require(id);
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
  payment_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
  payment_closed_reason: null, payment_cancelled_at: null, gateway_cancelled_at: null, can_cancel: true,
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
  assert.equal(midtrans.mapMidtransTransactionStatus({ transaction_status: "cancel" }), "cancelled");
  for (const transaction_status of ["deny", "expire", "failure"]) {
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

function reconciliationHarness({ claim = true, providerResult, providerResults, providerError, storedOrder = order, rpcError, cancelResult, cancelError } = {}) {
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
        gt(...args) { calls.push(["gt", ...args]); return this; },
        or(value) { calls.push(["or", value]); return this; },
        select() { return this; },
        async maybeSingle() { return { data: claim ? { merchant_order_id: order.merchant_order_id } : null, error: null }; },
        async single() { return { data: current, error: null }; },
      };
      return builder;
    },
    async rpc(name, input) {
      rpcCalls.push({ name, input });
      if (!rpcError) {
        if (name === "reconcile_subscription_payment") current = { ...current, status: input.p_status, gateway_status_checked_at: input.p_checked_at,
          gateway_cancelled_at: input.p_gateway_response?.transaction_status === "cancel" ? new Date().toISOString() : current.gateway_cancelled_at };
        else if (name === "cancel_subscription_payment" && current.status === "pending") current = { ...current, status: "cancelled", payment_closed_reason: "user_cancelled" };
        else if (name === "expire_subscription_payments" && current.status === "pending") current = { ...current, status: "failed", payment_closed_reason: "expired" };
      }
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
      checkMidtransTransactionStatus: async () => providerResults ? providerResults.shift() : providerResult,
      cancelMidtransTransaction: async () => { if (cancelError) throw new Error(cancelError); return cancelResult; },
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
    "@/server/subscription/payment-reconciliation": { expireSubscriptionPayments: async () => {}, SubscriptionPaymentBusyError: class extends Error {}, refreshSubscriptionPayment: () => { gatewayChecked = true; } },
  });
  const request = new Request("https://poskart.test/api/subscription/payments", {
    method: "POST", headers: { origin: "https://poskart.test", "Content-Type": "application/json" }, body: JSON.stringify({ order: "someone-elses-order" }),
  });
  request.nextUrl = new URL(request.url);
  assert.equal((await route.POST(request)).status, 404);
  assert.ok(filters.some(([column, value]) => column === "organization_id" && value === "my-org"));
  assert.equal(gatewayChecked, false);
});

test("payment expiry hides resume links and support includes Order ID and proof instructions", () => {
  const expired = { ...order, payment_expires_at: new Date(Date.now() - 1).toISOString() };
  assert.equal(types.isSubscriptionPaymentOpen(expired), false);
  assert.equal(types.getSubscriptionPaymentUrl(expired), null);
  assert.equal(types.getSubscriptionPaymentLabel(expired), "Pembayaran kedaluwarsa");
  assert.equal(types.getSubscriptionPaymentLabel({ ...expired, status: "paid" }), "Pembayaran berhasil");
  const support = new URL(types.getSubscriptionPaymentSupportUrl(expired));
  assert.equal(support.hostname, "wa.me");
  assert.match(support.searchParams.get("text"), /ORDER-1/);
  assert.match(support.searchParams.get("text"), /bukti pembayaran/);
  assert.equal(types.formatPaymentDate("invalid-date"), "—");
});

test("closed orders no longer call gateway status APIs", async () => {
  for (const status of ["failed", "cancelled"]) {
    const closed = { ...order, status };
    const harness = reconciliationHarness({ providerError: "Must not be called" });
    assert.equal(await harness.refreshSubscriptionPayment(harness.supabase, closed, "org-1"), closed);
    assert.equal(harness.rpcCalls.length, 0);
  }
  const expired = { ...order, payment_expires_at: new Date(Date.now() - 1000).toISOString() };
  const harness = reconciliationHarness({ storedOrder: expired, providerError: "Must not be called" });
  assert.equal((await harness.refreshSubscriptionPayment(harness.supabase, expired, "org-1")).payment_closed_reason, "expired");
  assert.equal(harness.rpcCalls[0].name, "expire_subscription_payments");
});

test("Duitku cancellation verifies gateway then cancels locally without changing subscription", async () => {
  const harness = reconciliationHarness({ providerResult: { merchantOrderId: "ORDER-1", statusCode: "01", amount: 150000, raw: {} } });
  const cancelled = await harness.cancelSubscriptionPayment(harness.supabase, order, "org-1");
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.gateway_cancelled_at, null);
  assert.deepEqual(harness.rpcCalls.map((call) => call.name), ["reconcile_subscription_payment", "cancel_subscription_payment"]);
  assert.equal(harness.rpcCalls[1].input.p_organization_id, "org-1");
});

test("cancellation detects a just-paid order and never cancels it", async () => {
  const harness = reconciliationHarness();
  const paid = await harness.cancelSubscriptionPayment(harness.supabase, order, "org-1");
  assert.equal(paid.status, "paid");
  assert.equal(harness.rpcCalls.some((call) => call.name === "cancel_subscription_payment"), false);
});

test("cancellation refuses in-flight checks and gateway outages", async () => {
  const busy = reconciliationHarness({ claim: false });
  await assert.rejects(busy.cancelSubscriptionPayment(busy.supabase, order, "org-1"), /sedang diperiksa/);
  assert.equal(busy.rpcCalls.length, 0);
  const unavailable = reconciliationHarness({ providerError: "Gateway unavailable" });
  await assert.rejects(unavailable.cancelSubscriptionPayment(unavailable.supabase, order, "org-1"));
  assert.equal(unavailable.rpcCalls.length, 0);
});

test("cancellation can reverify immediately after a completed check", async () => {
  const checkedOrder = { ...order, gateway_status_checked_at: new Date().toISOString() };
  const harness = reconciliationHarness();
  await harness.cancelSubscriptionPayment(harness.supabase, checkedOrder, "org-1");
  assert.ok(harness.calls.some((call) => call[0] === "or" && call[1].includes(`gateway_status_check_started_at.lte.${checkedOrder.gateway_status_checked_at}`)));
});

test("Midtrans cancellation calls authenticated cancel endpoint", async () => {
  const provider = loadTs("server/payments/midtrans.ts", {}, {
    process: { env: { MIDTRANS_MERCHANT_ID: "test", NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: "client", MIDTRANS_SERVER_KEY: "server" } },
    fetch: async (url, options) => {
      assert.equal(url, "https://api.sandbox.midtrans.com/v2/ORDER-1/cancel");
      assert.equal(options.method, "POST");
      assert.equal(options.headers.Authorization, `Basic ${Buffer.from("server:").toString("base64")}`);
      return Response.json({ order_id: "ORDER-1", transaction_status: "cancel", gross_amount: "150000", status_code: "200" });
    },
  });
  assert.equal((await provider.cancelMidtransTransaction("ORDER-1")).transaction_status, "cancel");
});

test("successful Midtrans cancellation persists gateway confirmation", async () => {
  const midtransOrder = { ...order, payment_gateway: "midtrans" };
  const harness = reconciliationHarness({ storedOrder: midtransOrder,
    providerResult: { order_id: "ORDER-1", transaction_status: "pending", gross_amount: "150000" },
    cancelResult: { order_id: "ORDER-1", transaction_status: "cancel", gross_amount: "150000" },
  });
  const result = await harness.cancelSubscriptionPayment(harness.supabase, midtransOrder, "org-1");
  assert.equal(result.status, "cancelled");
  assert.ok(result.gateway_cancelled_at);
});

test("Midtrans cancel rejection rechecks for settlement before any local cancellation", async (t) => {
  t.mock.method(console, "warn", () => {});
  const midtransOrder = { ...order, payment_gateway: "midtrans" };
  const harness = reconciliationHarness({ storedOrder: midtransOrder,
    providerResults: [
      { order_id: "ORDER-1", transaction_status: "pending", gross_amount: "150000" },
      { order_id: "ORDER-1", transaction_status: "settlement", gross_amount: "150000" },
    ],
    cancelError: "Merchant cannot modify transaction",
  });
  const result = await harness.cancelSubscriptionPayment(harness.supabase, midtransOrder, "org-1");
  assert.equal(result.status, "paid");
  assert.equal(harness.rpcCalls.some((call) => call.name === "cancel_subscription_payment"), false);
});

test("payment cancellation is restricted to its creator or organization owner/admin", async () => {
  for (const role of ["designer", "owner"]) {
    let cancelled = false;
    const membershipBuilder = {
      select() { return this; }, eq() { return this; }, limit() { return this; },
      async maybeSingle() { return { data: { organization_id: "org-1", role }, error: null }; },
    };
    const orderBuilder = {
      select() { return this; }, eq() { return this; },
      async maybeSingle() { return { data: { ...order, profile_id: "another-user" }, error: null }; },
    };
    const route = loadTs("app/api/subscription/payments/route.ts", {
      "next/server": { NextResponse: { json: (body, options) => Response.json(body, options) } },
      "@/lib/supabase/server": { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) }, from: () => membershipBuilder }) },
      "@/lib/supabase/admin": { createSupabaseAdminClient: () => ({ from: () => orderBuilder }) },
      "@/server/subscription/payment-reconciliation": { expireSubscriptionPayments: async () => {}, SubscriptionPaymentBusyError: class extends Error {}, cancelSubscriptionPayment: async () => { cancelled = true; return { ...order, status: "cancelled" }; } },
    });
    const request = new Request("https://poskart.test/api/subscription/payments", {
      method: "POST", headers: { origin: "https://poskart.test", "Content-Type": "application/json" }, body: JSON.stringify({ order: "ORDER-1", action: "cancel" }),
    });
    request.nextUrl = new URL(request.url);
    const response = await route.POST(request);
    assert.equal(response.status, role === "owner" ? 200 : 403);
    assert.equal(cancelled, role === "owner");
    if (role === "owner") assert.equal((await response.json()).order.can_cancel, true);
  }
});

test("new invoices request a 15-minute expiry from both gateways", async () => {
  const plan = { id: "starter", name: "Starter" };
  const config = { env: { MIDTRANS_MERCHANT_ID: "test", NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: "client", MIDTRANS_SERVER_KEY: "server", DUITKU_MERCHANT_CODE: "test", DUITKU_API_KEY: "test" } };
  const midtransProvider = loadTs("server/payments/midtrans.ts", {}, {
    process: config,
    fetch: async (_url, options) => {
      assert.equal(JSON.parse(options.body).expiry.duration, 15);
      return Response.json({ redirect_url: "https://app.midtrans.com/payment" });
    },
  });
  const duitkuProvider = loadTs("server/payments/duitku.ts", {}, {
    process: config,
    fetch: async (_url, options) => {
      assert.equal(JSON.parse(options.body).expiryPeriod, 15);
      return Response.json({ paymentUrl: "https://app-prod.duitku.com/payment", reference: "ref" });
    },
  });
  const input = { merchantOrderId: "ORDER-1", amount: 150000, plan, customerName: "Test", email: "test@example.com", deviceCount: 1, returnUrl: "https://poskart.test/checkout/return" };
  await midtransProvider.createMidtransPayment(input);
  await duitkuProvider.createDuitkuPayment({ ...input, callbackUrl: "https://poskart.test/api/payments/duitku/callback" });
});

test("HTML, malformed JSON and native Safari errors receive friendly messages", async () => {
  for (const response of [new Response("<html>Login</html>"), new Response("{bad-json"), Response.json(null)]) {
    const requests = loadTs("features/billing/subscription/payment-request.ts", {}, { fetch: async () => response });
    await assert.rejects(requests.requestSubscriptionPayment("/api/subscription/payments"), /Respons pembayaran belum dapat dibaca/);
  }
  const requests = loadTs("features/billing/subscription/payment-request.ts", {}, {
    fetch: async () => { throw new SyntaxError("The string did not match the expected pattern."); },
  });
  await assert.rejects(requests.requestSubscriptionPayment("/api/subscription/payments"), (error) => error.status === 502 && !error.message.includes("expected pattern") && error.message.includes("jangan bayar ulang"));
});

test("redirected payment API response asks user to sign in", async () => {
  const requests = loadTs("features/billing/subscription/payment-request.ts", {}, { fetch: async () => ({ redirected: true }) });
  await assert.rejects(requests.requestSubscriptionPayment("/api/subscription/payments"), (error) => error.status === 401);
});

test("history has no check, resume or cancel actions for closed payments", () => {
  for (const status of ["failed", "cancelled", "paid"]) {
    const payment = { ...order, status };
    const state = { orders: [payment], now: Date.now(), isLoading: false, isFetching: false, error: null,
      checkErrors: {}, check: { isPending: false, variables: null, error: null }, cancel: { isPending: false, variables: null, error: null } };
    const ui = loadTs("features/billing/subscription/subscription-payments-panel.tsx", {
      "next/link": ({ children, href }) => createElement("a", { href }, children),
      "@/components/ui/button": { Button: ({ children }) => createElement("button", {}, children), buttonVariants: () => "" },
      "@/lib/utils": { formatCurrency: (amount) => `Rp${amount}` },
      "./payment-types": types,
      "./payment-actions": { CancelPaymentButton: () => createElement("button", {}, "Batalkan pembayaran"), PaymentDeadline: () => null, PaymentClosedNotice: () => createElement("p", {}, "Kirim bukti pembayaran") },
      "./use-subscription-payments": { useSubscriptionPayments: () => state },
    });
    const html = renderToStaticMarkup(createElement(ui.SubscriptionPaymentsPanel));
    assert.doesNotMatch(html, />Cek status</);
    assert.doesNotMatch(html, /Lanjutkan pembayaran|Batalkan pembayaran/);
    assert.match(html, /<details>/);
    if (status !== "paid") assert.match(html, /Hubungi admin/);
  }
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
    await db.exec(`insert into subscription_orders (merchant_order_id, organization_id, plan_id, duration_months, device_count, created_at)
      values ('SQL-STALE', 'org-1', 'starter', 1, 1, now() - interval '1 day');`);
    await db.exec(readFileSync(new URL("supabase/migrations/20261013100000_subscription_payment_expiry_and_cancellation.sql", root), "utf8"));
    assert.equal((await db.query("select status, payment_closed_reason from subscription_orders where merchant_order_id = 'SQL-STALE'")).rows[0].payment_closed_reason, "expired");
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

    // Closing invoices must not change an active subscription. A late paid
    // callback must still extend it once, even after expiry or cancellation.
    await db.exec(`insert into subscription_orders (merchant_order_id, organization_id, plan_id, duration_months, device_count)
      values ('SQL-CANCEL', 'org-1', 'starter', 1, 1), ('SQL-TIMEOUT', 'org-1', 'starter', 1, 1);`);
    const beforeClose = await expiry();
    await db.query("select cancel_subscription_payment('SQL-CANCEL', 'org-1')");
    await db.query("select cancel_subscription_payment('SQL-CANCEL', 'org-1')");
    await reconcile("SQL-CANCEL", "pending");
    await reconcile("SQL-CANCEL", "failed");
    assert.equal((await db.query("select status from subscription_orders where merchant_order_id = 'SQL-CANCEL'")).rows[0].status, "cancelled");
    assert.equal(await expiry(), beforeClose);
    await db.exec("update subscription_orders set payment_expires_at = now() - interval '1 second' where merchant_order_id = 'SQL-TIMEOUT'");
    await db.query("select expire_subscription_payments('org-1')");
    assert.equal((await db.query("select payment_closed_reason from subscription_orders where merchant_order_id = 'SQL-TIMEOUT'")).rows[0].payment_closed_reason, "expired");
    assert.equal(await expiry(), beforeClose);
    await reconcile("SQL-CANCEL");
    const afterLatePaid = await expiry();
    assert.notEqual(afterLatePaid, beforeClose);
    await reconcile("SQL-CANCEL");
    await db.query("select cancel_subscription_payment('SQL-CANCEL', 'org-1')");
    assert.equal(await expiry(), afterLatePaid);
    assert.equal((await db.query("select payment_closed_reason from subscription_orders where merchant_order_id = 'SQL-CANCEL'")).rows[0].payment_closed_reason, null);
    await reconcile("SQL-TIMEOUT");
    assert.equal((await db.query("select status from subscription_orders where merchant_order_id = 'SQL-TIMEOUT'")).rows[0].status, "paid");
    await assert.rejects(db.query("select cancel_subscription_payment('SQL-CANCEL', 'other-org')"));
    for (const fn of ["cancel_subscription_payment(text,text)", "expire_subscription_payments(text)"]) {
      assert.equal((await db.query("select has_function_privilege('authenticated', $1, 'EXECUTE') as allowed", [fn])).rows[0].allowed, false);
    }
  } finally { await db.close(); }
});
