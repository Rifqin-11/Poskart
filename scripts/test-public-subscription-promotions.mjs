import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../lib/subscription-public-promotions.ts', import.meta.url), 'utf8');
const mod = { exports: {} };
new Function('exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mod.exports);
const { publicPromotionDiscount, bestPublicPromotion, publicPromotionCondition } = mod.exports;
const campaign = { id: 'one', name: 'Christmas', code: null, application_mode: 'automatic',
  starts_at: '2020-01-01', ends_at: '2099-01-01', discount_type: 'percentage', discount_value: 10,
  discount_tiers: [{ minAmount: 300000, value: 20 }], max_discount: 50000, min_amount: 100000,
  plan_ids: ['pro'], audience: 'all' };

test('marketing price matches tier, cap, minimum and package rules', () => {
  assert.equal(publicPromotionDiscount(campaign, 'pro', 100001), 10000);
  assert.equal(publicPromotionDiscount(campaign, 'pro', 300000), 50000);
  assert.equal(publicPromotionDiscount(campaign, 'starter', 300000), 0);
  assert.equal(publicPromotionDiscount(campaign, 'pro', 99999), 0);
});
test('expired and future campaigns never change marketing price', () => {
  assert.equal(publicPromotionDiscount(campaign, 'pro', 300000, Date.parse('2100-01-01')), 0);
  assert.equal(publicPromotionDiscount(campaign, 'pro', 300000, Date.parse('2019-01-01')), 0);
});
test('largest offer wins without stacking; original price remains untouched', () => {
  const other = { ...campaign, id: 'two', discount_value: 30, discount_tiers: [], max_discount: null };
  assert.equal(bestPublicPromotion([campaign, other], 'pro', 300000).discount, 90000);
  assert.equal(campaign.discount_value, 10);
  assert.equal(bestPublicPromotion([], 'pro', 300000), null);
});
test('voucher and audience conditions are visible rather than promising universal prices', () => {
  assert.match(publicPromotionCondition(campaign), /Otomatis/);
  assert.match(publicPromotionCondition({ ...campaign, application_mode: 'voucher', code: 'XMAS20', audience: 'new' }), /Kode XMAS20 · Organisasi baru/);
  assert.match(publicPromotionCondition({ ...campaign, audience: 'existing' }), /Pelanggan lama/);
});
