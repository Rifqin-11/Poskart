// POSKART_PGLITE_MODULE=/path/to/@electric-sql/pglite node --test scripts/test-subscription-campaigns.mjs
// Uses an isolated in-memory Postgres; never connects to Supabase.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';

const modulePath = process.env.POSKART_PGLITE_MODULE;
test('subscription campaign SQL: eligibility, money, quota, snapshots, audit and permissions', { skip: !modulePath }, async () => {
  const { PGlite } = await import(pathToFileURL(`${modulePath}/dist/index.js`).href);
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.role() returns text language sql as $$ select current_setting('test.role', true) $$;
      set test.role = 'service_role';
      create table public.subscription_orders (
        id uuid primary key default gen_random_uuid(), organization_id text, plan_id text,
        amount integer not null, base_amount integer not null, additional_device_amount integer not null default 0,
        status text not null default 'pending'
      );
    `);
    await db.exec(readFileSync(new URL('../supabase/migrations/20261021120000_subscription_campaigns.sql', import.meta.url), 'utf8'));
    await db.exec(readFileSync(new URL('../supabase/migrations/20261021140000_subscription_automatic_campaigns.sql', import.meta.url), 'utf8'));
    const actor = '11111111-1111-4111-8111-111111111111';
    await db.query('insert into auth.users values ($1)', [actor]);
    const { rows: [campaign] } = await db.query(`insert into subscription_campaigns
      (name,code,status,starts_at,ends_at,discount_type,discount_value,max_discount,min_amount,plan_ids,usage_limit,updated_by)
      values ('Christmas','XMAS20','published',now()-interval '1 day',now()+interval '14 days','percentage',20,50000,100000,array['pro'],2,$1) returning id`, [actor]);
    const quote = async (code = 'xmas20', org = 'org1', plan = 'pro', amount = 300000) => {
      const { rows } = await db.query('select quote_subscription_campaign($1,$2,$3,$4) as q', [code, org, plan, amount]);
      return rows[0].q;
    };
    assert.deepEqual(await quote(), { campaignId: campaign.id, name: 'Christmas', code: 'XMAS20', discountAmount: 50000, totalAmount: 250000 });
    assert.equal((await quote('XMAS20', 'org1', 'pro', 100001)).discountAmount, 20000);
    await assert.rejects(quote('MISSING'), /tidak tersedia/);
    await assert.rejects(quote('XMAS20', 'org1', 'starter'), /paket/);
    await assert.rejects(quote('XMAS20', 'org1', 'pro', 99999), /Minimum/);
    for (const status of ['draft','paused','archived']) {
      await db.query('update subscription_campaigns set status=$1 where id=$2', [status, campaign.id]);
      await assert.rejects(quote(), /tidak tersedia/);
    }
    await db.query("update subscription_campaigns set status='published', starts_at=now()+interval '1 hour' where id=$1", [campaign.id]);
    await assert.rejects(quote(), /periode/);
    await db.query("update subscription_campaigns set starts_at=now()-interval '1 day', ends_at=now() where id=$1", [campaign.id]);
    await assert.rejects(quote(), /periode/);
    await db.query("update subscription_campaigns set ends_at=now()+interval '1 day', audience='existing' where id=$1", [campaign.id]);
    await assert.rejects(quote(), /organisasi/);
    await db.exec("insert into subscription_orders(organization_id,plan_id,amount,base_amount,status) values ('returning','pro',100000,100000,'paid')");
    assert.equal((await quote('XMAS20', 'returning')).totalAmount, 250000);
    await db.query("update subscription_campaigns set audience='new' where id=$1", [campaign.id]);
    await assert.rejects(quote('XMAS20', 'returning'), /organisasi/);
    const insert = (org, amount = 250000) => db.query(`insert into subscription_orders
      (organization_id,plan_id,base_amount,amount,campaign_id,promotion_code)
      values ($1,'pro',300000,$2,$3,'XMAS20') returning *`, [org, amount, campaign.id]);
    await db.exec("set test.role = 'authenticated'");
    await assert.rejects(insert('org1'), /authenticated checkout/);
    await db.exec("set test.role = 'service_role'");
    await assert.rejects(insert('org1', 1), /Harga promo berubah/);
    const { rows: [order] } = await insert('org1');
    assert.equal(order.amount, 250000);
    assert.equal(order.discount_amount, 50000);
    assert.equal(order.promotion_name, 'Christmas');
    await assert.rejects(insert('org1'), /Kuota/);
    await db.query("update subscription_orders set status='cancelled' where id=$1", [order.id]);
    await assert.rejects(insert('org1'), /Kuota/);
    const { rows: [second] } = await insert('org2');
    await assert.rejects(insert('org3'), /Kuota/);
    await db.query("update subscription_orders set status='paid' where id=$1", [second.id]);
    await db.query("update subscription_campaigns set name='New name',discount_value=10 where id=$1", [campaign.id]);
    const { rows: [snapshot] } = await db.query('select * from subscription_orders where id=$1', [order.id]);
    assert.equal(snapshot.amount, 250000);
    assert.equal(snapshot.promotion_name, 'Christmas');
    const { rows: [stats] } = await db.query('select * from subscription_campaign_statistics()');
    assert.equal(Number(stats.issued), 2);
    assert.equal(Number(stats.paid), 1);
    assert.equal(Number(stats.total_discount), 50000);
    const { rows: audits } = await db.query('select * from subscription_campaign_audit order by created_at');
    assert.ok(audits.length >= 8);
    assert.equal(audits[0].actor_id, actor);
    assert.equal(audits[0].before_data, null);
    assert.ok(audits.at(-1).before_data);
    await db.exec('set role authenticated');
    await assert.rejects(db.query('select * from subscription_campaigns'), /permission denied/);
    await assert.rejects(db.query('select * from subscription_campaign_audit'), /permission denied/);
    await assert.rejects(quote(), /permission denied/);
    await db.exec('reset role');
    await db.query(`insert into subscription_campaigns(name,code,status,starts_at,ends_at,discount_type,discount_value)
      values ('Fixed','FIXED','published',now()-interval '1 day',now()+interval '1 day','fixed',200000)`);
    const fixed = await quote('FIXED', 'org4', 'starter', 100000);
    assert.equal(fixed.totalAmount, 1);
    assert.equal(fixed.discountAmount, 99999);
    await db.query(`insert into subscription_campaigns(name,code,status,starts_at,ends_at,discount_type,discount_value,discount_tiers)
      values ('Up to 20%','TIERS','published',now()-interval '1 day',now()+interval '1 day','percentage',5,
      '[{"minAmount":100000,"value":10},{"minAmount":300000,"value":15},{"minAmount":500000,"value":20}]')`);
    assert.equal((await quote('TIERS', 'tiers', 'pro', 50000)).discountAmount, 2500);
    assert.equal((await quote('TIERS', 'tiers', 'pro', 100000)).discountAmount, 10000);
    assert.equal((await quote('TIERS', 'tiers', 'pro', 300000)).discountAmount, 45000);
    assert.equal((await quote('TIERS', 'tiers', 'pro', 500000)).discountAmount, 100000);
    for (const tiers of ['{}', '[{"minAmount":0,"value":101}]', '[{"minAmount":0,"value":10},{"minAmount":0,"value":20}]', '[{"value":10}]', '[{"minAmount":-1,"value":10}]']) {
      await assert.rejects(db.query("update subscription_campaigns set discount_tiers=$1::jsonb where code='TIERS'", [tiers]), /discount tier/i);
    }
    const automaticQuote = async () => (await db.query("select quote_automatic_subscription_campaign('auto-org','pro',500000) q")).rows[0].q;
    assert.equal(await automaticQuote(), null, 'voucher campaigns are never automatic');
    await db.query("update subscription_campaigns set application_mode='automatic' where code in ('TIERS','FIXED')");
    assert.equal((await automaticQuote()).code, 'FIXED', 'largest eligible discount wins');
    await db.query("update subscription_campaigns set status='paused' where code='FIXED'");
    assert.equal((await automaticQuote()).code, 'TIERS');
    await db.query("update subscription_campaigns set plan_ids=array['starter'] where code='TIERS'");
    assert.equal(await automaticQuote(), null, 'automatic selection respects plan eligibility');
  } finally { await db.close(); }
});
