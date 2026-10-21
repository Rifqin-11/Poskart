// node --test scripts/test-subscription-campaign-checkout.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(path, overrides) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function('exports', 'require', 'module', compiled)(mod.exports, (id) => {
    if (id in overrides) return overrides[id];
    return id.startsWith('@/') ? load(`${id.slice(2)}.ts`, overrides) : require(id);
  }, mod);
  return mod.exports;
}

function setup({ gateway = 'duitku', quoteError, insertError, existing = null, automatic = false } = {}) {
  const inserts = [], payments = [], quotes = [], filters = [];
  const plan = { id: 'pro', name: 'Pro', amount: 300000, includedDevices: 1, additionalDevicePriceMonthly: 50000, durationMonths: 1 };
  const promotion = { campaignId: 'campaign-id', code: 'XMAS20', name: 'Christmas', discountAmount: 70000, totalAmount: 280000 };
  const session = {
    auth: { getUser: async () => ({ data: { user: { id: 'user1', email: 'owner@example.com', user_metadata: {} } } }) },
    from(table) {
      const result = table === 'organization_members' ? { organization_id: 'org1' } : { subscription_payment_gateway: gateway };
      return { select() { return this; }, eq() { return this; }, limit() { return this; }, maybeSingle: async () => ({ data: result }) };
    },
  };
  const admin = {
    from() {
      return {
        select() { return this; }, eq() { return this; }, not() { return this; }, order() { return this; }, limit() { return this; },
        filter(...args) { filters.push(args); return this; },
        maybeSingle: async () => ({ data: existing }),
        insert(values) { inserts.push(values); return this; },
        single: async () => ({ data: insertError ? null : { amount: inserts.at(-1).amount }, error: insertError ? { message: insertError } : null }),
        update() { return { eq: async () => ({ error: null }) }; },
      };
    },
  };
  const checkout = load('app/(admin)/checkout/actions.ts', {
    'next/navigation': { redirect: (url) => { throw new Error(`redirect:${url}`); } },
    '@/lib/supabase/server': { createClient: async () => session },
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => admin },
    '@/lib/auth/site-url': { getSiteUrl: async () => 'https://poskart.test' },
    '@/server/subscription/pricing': { getPublicSubscriptionPricingPlans: async () => [plan] },
    '@/server/subscription/promotions': { quoteAutomaticSubscriptionPromotion: async () => automatic ? promotion : null, quoteSubscriptionPromotion: async (...args) => { quotes.push(args); if (quoteError) throw new Error(quoteError); return promotion; } },
    '@/server/subscription/payment-reconciliation': { expireSubscriptionPayments: async () => {}, refreshSubscriptionPayment: async (_db, order) => order, subscriptionPaymentColumns: '*' },
    '@/server/payments/duitku': {
      createMerchantOrderId: () => 'ORDER1', getDuitkuConfig: () => null,
      createDuitkuPayment: async (input) => { payments.push(input); return { reference: 'ref', paymentUrl: 'https://app-prod.duitku.com/payment/1' }; },
    },
    '@/server/payments/midtrans': { createMidtransPayment: async (input) => { payments.push(input); return { paymentUrl: 'https://app.midtrans.com/snap/1', token: 'token' }; } },
  });
  const form = new FormData();
  form.set('planId', 'pro'); form.set('deviceCount', '2'); form.set('paymentGateway', gateway);
  form.set('promotionCode', 'xmas20'); form.set('promotionTotal', '280000');
  return { run: () => checkout.createSubscriptionOrderAction(form), form, inserts, payments, quotes, filters };
}

for (const gateway of ['duitku', 'midtrans']) {
  test(`${gateway}: server subtotal and persisted discounted amount reach gateway`, async () => {
    const s = setup({ gateway });
    const result = await s.run();
    assert.equal(result.ok, true);
    assert.equal(result.gateway, gateway);
    assert.equal(s.quotes[0][4], 350000);
    assert.equal(s.quotes[0][2], 'org1');
    assert.equal(s.inserts[0].amount, 280000);
    assert.equal(s.inserts[0].campaign_id, 'campaign-id');
    assert.equal(s.inserts[0].promotion_code, 'XMAS20');
    assert.equal(s.payments[0].amount, 280000);
  });
}

test('checkout without voucher preserves the original subtotal', async () => {
  const s = setup(); s.form.delete('promotionCode'); s.form.delete('promotionTotal');
  assert.equal((await s.run()).ok, true);
  assert.equal(s.quotes.length, 0);
  assert.equal(s.inserts[0].campaign_id, null);
  assert.equal(s.payments[0].amount, 350000);
  assert.deepEqual(s.filters[0], ['promotion_code', 'is', null]);
});

test('invalid eligibility and exhausted quota never create an order or call gateway', async () => {
  const s = setup({ quoteError: 'Kuota voucher habis' });
  const result = await s.run();
  assert.equal(result.ok, false);
  assert.match(result.message, /Kuota/);
  assert.equal(s.inserts.length, 0); assert.equal(s.payments.length, 0);
});

test('changed preview price requires explicit reapplication', async () => {
  const s = setup(); s.form.set('promotionTotal', '1');
  assert.match((await s.run()).message, /Terapkan ulang/);
  assert.equal(s.inserts.length, 0); assert.equal(s.payments.length, 0);
});

test('database trigger quota rejection never reaches gateway', async () => {
  const s = setup({ insertError: 'Kuota voucher telah digunakan' });
  assert.equal((await s.run()).ok, false);
  assert.equal(s.payments.length, 0);
});

test('resume the already-issued invoice without claiming quota again', async () => {
  const s = setup({ quoteError: 'Quota already used', existing: {
    merchant_order_id: 'PREVIOUS', amount: 280000, status: 'pending', payment_gateway: 'duitku',
    payment_url: 'https://app-prod.duitku.com/payment/previous', payment_reference: 'previous-ref',
    created_at: new Date().toISOString(), payment_expires_at: new Date(Date.now() + 600000).toISOString(),
  } });
  const result = await s.run();
  assert.equal(result.ok, true); assert.equal(result.merchantOrderId, 'PREVIOUS');
  assert.equal(s.quotes.length, 0); assert.equal(s.inserts.length, 0); assert.equal(s.payments.length, 0);
});

test('automatic promotion applies without a voucher code and reaches the gateway', async () => {
  const s = setup({ automatic: true }); s.form.delete('promotionCode');
  assert.equal((await s.run()).ok, true);
  assert.equal(s.inserts[0].promotion_code, 'XMAS20');
  assert.equal(s.payments[0].amount, 280000);
  assert.equal(s.quotes.length, 0);
});

test('automatic promotion changed since preview blocks payment', async () => {
  const s = setup({ automatic: true }); s.form.delete('promotionCode'); s.form.set('promotionTotal', '350000');
  assert.match((await s.run()).message, /Promo berubah/);
  assert.equal(s.inserts.length, 0);
});

test('expired automatic promotion cannot silently increase the charge', async () => {
  const s = setup(); s.form.delete('promotionCode');
  assert.match((await s.run()).message, /Promo berubah/);
  assert.equal(s.payments.length, 0);
});
