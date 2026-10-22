// Isolated PostgreSQL/WASM tests; never connects to Supabase or a real project.
// Install @electric-sql/pglite in a temporary directory, then run:
// PGLITE_MODULE=/absolute/path/node_modules/@electric-sql/pglite/dist/index.js \
//   node --test scripts/test-self-service-trials-db.mjs
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

const migration = name => readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8");

test("self-service trial database invariants", { skip: !process.env.PGLITE_MODULE }, async t => {
  const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    grant usage on schema public, auth to authenticated, anon;
    create table public.profiles (
      id uuid primary key references auth.users on delete cascade, email text, role text default 'user'
    );
    create table public.organizations (id text primary key, name text);
    create table public.organization_members (
      organization_id text references organizations on delete cascade,
      profile_id uuid references profiles on delete cascade, role text,
      primary key (organization_id, profile_id)
    );
    create table public.devices (id text primary key);
    create table public.subscription_plans (id text primary key, name text, max_devices integer);
    insert into subscription_plans values ('free', 'Free', 1), ('starter', 'Starter', 1);
    create table public.subscriptions (
      organization_id text primary key references organizations on delete cascade,
      plan_id text references subscription_plans, status text,
      current_period_end timestamptz, device_limit integer default 1, updated_at timestamptz default now()
    );
  `);
  await db.exec(migration("20260801140000_trial_system.sql"));

  async function identity(email = `${randomUUID()}@example.com`, role = "user", verified = true) {
    const userId = randomUUID();
    const orgId = `org-${randomUUID()}`;
    await db.query("insert into auth.users values ($1, $2, $3)", [userId, email, verified ? new Date().toISOString() : null]);
    await db.query("insert into profiles values ($1, $2, $3)", [userId, email, role]);
    await addOrg(userId, orgId);
    return { userId, orgId, email };
  }
  async function addOrg(userId, orgId = `org-${randomUUID()}`, role = "owner") {
    await db.query("insert into organizations values ($1, 'Test organization')", [orgId]);
    await db.query("insert into organization_members values ($1, $2, $3)", [orgId, userId, role]);
    return orgId;
  }
  async function rpc(userId, fn, args = [], role = "authenticated") {
    return db.transaction(async tx => {
      await tx.exec(`set local role ${role}`);
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
      const params = args.map((_, i) => `$${i + 1}`).join(", ");
      return (await tx.query(`select public.${fn}(${params}) as result`, args)).rows[0].result;
    });
  }
  const start = who => rpc(who.userId, "submit_trial_request", [who.orgId]);
  const eligibility = who => rpc(who.userId, "get_trial_eligibility", [who.orgId]);

  const legacy = [];
  for (const status of ["expired", "revoked", "converted"]) {
    const who = await identity();
    const requestId = randomUUID();
    const claimId = randomUUID();
    await db.query(`insert into trial_requests
      (id, organization_id, requester_profile_id, email_snapshot, status, activated_at)
      values ($1, $2, $3, $4, 'activated', now() - interval '30 days')`,
    [requestId, who.orgId, who.userId, `  ${who.email.toUpperCase()}  `]);
    await db.query(`insert into trial_claims
      (id, request_id, organization_id, owner_profile_id, status, ends_at)
      values ($1, $2, $3, $4, $5, now() - interval '16 days')`, [claimId, requestId, who.orgId, who.userId, status]);
    legacy.push(who);
  }
  const historicalRequest = await identity();
  await db.query(`insert into trial_requests
    (organization_id, requester_profile_id, email_snapshot, status, activated_at)
    values ($1, $2, $3, 'canceled', now() - interval '30 days')`,
  [historicalRequest.orgId, historicalRequest.userId, historicalRequest.email]);
  legacy.push(historicalRequest);
  await db.exec(migration("20261022090000_self_service_trials.sql"));
  const admin = await identity("admin@example.com", "admin");

  await t.test("eligible owners immediately get 14 days and one device; retries never extend", async () => {
    const who = await identity();
    assert.equal((await eligibility(who)).eligible, true);
    const before = Date.now();
    const result = await start(who);
    assert.equal(result.auto_rejected, false);
    assert.equal(result.already_active, false);
    assert.ok(Math.abs(new Date(result.ends_at).getTime() - before - 14 * 86_400_000) < 10_000);
    const sub = (await db.query("select * from subscriptions where organization_id = $1", [who.orgId])).rows[0];
    assert.equal(sub.status, "trialing");
    assert.equal(sub.plan_id, "starter-trial");
    assert.equal(sub.device_limit, 1);
    const retry = await start(who);
    assert.equal(retry.already_active, true);
    assert.equal(retry.claim_id, result.claim_id);
    assert.equal(retry.ends_at, result.ends_at);
    assert.equal((await db.query("select * from trial_identifiers where claim_id = $1", [result.claim_id])).rows.length, 3);
  });

  await t.test("legacy expired/revoked/converted usage backfills normalized emails and organizations", async () => {
    for (const who of legacy) {
      assert.equal((await eligibility(who)).reason, "duplicate_organization");
      assert.equal((await start(who)).auto_rejected, true);
      const other = await identity(who.email.toUpperCase());
      assert.equal((await eligibility(other)).reason, "duplicate_email");
      assert.equal((await start(other)).auto_rejected, true);
    }
  });

  await t.test("same email on another account/organization cannot claim again", async () => {
    const who = await identity();
    await start(who);
    const other = await identity(` ${who.email.toUpperCase()} `);
    const result = await start(other);
    assert.equal(result.auto_rejected, true);
    assert.equal(result.rejection_code, "duplicate_email");
    assert.equal((await db.query("select * from subscriptions where organization_id = $1", [other.orgId])).rows.length, 0);
  });

  await t.test("changing an owner's email and organization does not reset their allowance", async () => {
    const who = await identity();
    await start(who);
    await db.query("update auth.users set email = $1 where id = $2", [`${randomUUID()}@example.com`, who.userId]);
    who.orgId = await addOrg(who.userId);
    assert.equal((await start(who)).rejection_code, "duplicate_owner");
  });

  await t.test("changing the organization owner cannot restart an expired trial, even before cron", async () => {
    const who = await identity();
    const result = await start(who);
    await db.query("update trial_claims set ends_at = now() - interval '1 minute' where id = $1", [result.claim_id]);
    await db.query("update subscriptions set current_period_end = now() - interval '1 minute' where organization_id = $1", [who.orgId]);
    const other = await identity();
    await db.query("delete from organization_members where organization_id = $1", [who.orgId]);
    await db.query("insert into organization_members values ($1, $2, 'owner')", [who.orgId, other.userId]);
    other.orgId = who.orgId;
    assert.equal((await eligibility(other)).claim_status, "expired");
    assert.equal((await start(other)).rejection_code, "duplicate_organization");
  });

  await t.test("legacy pending requests activate on owner action, without approval", async () => {
    const who = await identity();
    const requestId = randomUUID();
    await db.query(`insert into trial_requests (id, organization_id, requester_profile_id, email_snapshot)
      values ($1, $2, $3, $4)`, [requestId, who.orgId, who.userId, who.email]);
    assert.equal((await start(who)).request_id, requestId);
    assert.equal((await db.query("select status from trial_requests where id = $1", [requestId])).rows[0].status, "activated");
  });

  await t.test("verified Auth email is required; an editable profile email cannot bypass this", async () => {
    const who = await identity(undefined, "user", false);
    assert.equal((await start(who)).rejection_code, "email_unverified");
    await db.query("update auth.users set email_confirmed_at = now() where id = $1", [who.userId]);
    await db.query("update profiles set email = 'forged@example.com' where id = $1", [who.userId]);
    const result = await start(who);
    const request = (await db.query("select email_snapshot from trial_requests where id = $1", [result.request_id])).rows[0];
    assert.equal(request.email_snapshot, who.email);
  });

  await t.test("anonymous callers, members, and forged organization IDs cannot start trials", async () => {
    const who = await identity();
    await assert.rejects(rpc(who.userId, "submit_trial_request", [who.orgId], "anon"), /permission denied/);
    await assert.rejects(rpc(null, "submit_trial_request", [who.orgId]), /Only the organization owner/);
    const other = await identity();
    await assert.rejects(rpc(other.userId, "submit_trial_request", [who.orgId]), /Only the organization owner/);
    await db.query("update organization_members set role = 'admin' where profile_id = $1", [who.userId]);
    await assert.rejects(start(who), /Only the organization owner/);
    await assert.rejects(eligibility(who), /Only the organization owner/);
  });

  await t.test("only superadmin can revoke; a reason is required; trial stays consumed", async () => {
    const who = await identity();
    const result = await start(who);
    await assert.rejects(rpc(who.userId, "revoke_trial", [result.request_id, "Abuse detected"]), /Only superadmin/);
    await assert.rejects(rpc(admin.userId, "revoke_trial", [result.request_id, " "]), /Alasan pembatalan/);
    await rpc(admin.userId, "revoke_trial", [result.request_id, "  Indikasi abuse berulang  "]);
    const claim = (await db.query("select * from trial_claims where id = $1", [result.claim_id])).rows[0];
    assert.equal(claim.status, "revoked");
    assert.equal(claim.revoked_by, admin.userId);
    assert.equal(claim.revoke_reason, "Indikasi abuse berulang");
    const sub = (await db.query("select * from subscriptions where organization_id = $1", [who.orgId])).rows[0];
    assert.equal(sub.status, "free");
    assert.equal(sub.plan_id, "free");
    assert.equal(sub.current_period_end, null);
    assert.equal((await eligibility(who)).claim_status, "revoked");
    assert.equal((await start(who)).rejection_code, "duplicate_organization");
    assert.equal((await rpc(admin.userId, "revoke_trial", [result.request_id, "Retry revocation"])).already_revoked, true);
    assert.equal((await db.query("select * from organizations where id = $1", [who.orgId])).rows.length, 1);
  });

  await t.test("paid subscriptions cannot be overwritten or revoked, and converted status is tracked", async () => {
    const who = await identity();
    const result = await start(who);
    await db.query(`update subscriptions set plan_id = 'starter', status = 'active',
      current_period_end = now() + interval '30 days' where organization_id = $1`, [who.orgId]);
    await assert.rejects(rpc(admin.userId, "revoke_trial", [result.request_id, "Cannot revoke paid"]), /Tidak ada trial aktif|Paket berbayar/);
    assert.equal((await eligibility(who)).claim_status, "converted");
    assert.equal((await start(who)).auto_rejected, true);
    assert.equal((await db.query("select plan_id from subscriptions where organization_id = $1", [who.orgId])).rows[0].plan_id, "starter");
    const paid = await identity();
    await db.query("insert into subscriptions (organization_id, plan_id, status) values ($1, 'starter', 'active')", [paid.orgId]);
    assert.equal((await start(paid)).rejection_code, "subscription_exists");
  });

  await t.test("subscription and claim mutations roll back together on failure", async () => {
    const who = await identity();
    const result = await start(who);
    await db.exec(`create function fail_trial_revoke() returns trigger language plpgsql as $$
      begin if new.status = 'free' then raise exception 'simulated failure'; end if; return new; end; $$;
      create trigger fail_trial_revoke before update on subscriptions for each row execute function fail_trial_revoke();`);
    try {
      await assert.rejects(rpc(admin.userId, "revoke_trial", [result.request_id, "Abuse detected"]), /simulated failure/);
      assert.equal((await db.query("select status from trial_claims where id = $1", [result.claim_id])).rows[0].status, "active");
      assert.equal((await db.query("select status from trial_requests where id = $1", [result.request_id])).rows[0].status, "activated");
    } finally {
      await db.exec("drop trigger fail_trial_revoke on subscriptions; drop function fail_trial_revoke();");
    }
  });

  await t.test("failed activation rolls back the request, claim, and allowance identifiers", async () => {
    const who = await identity();
    await db.exec(`create function fail_trial_start() returns trigger language plpgsql as $$
      begin if new.status = 'trialing' then raise exception 'simulated activation failure'; end if; return new; end; $$;
      create trigger fail_trial_start before insert or update on subscriptions for each row execute function fail_trial_start();`);
    try {
      await assert.rejects(start(who), /simulated activation failure/);
      assert.equal((await eligibility(who)).eligible, true);
      assert.equal((await db.query("select * from trial_requests where organization_id = $1", [who.orgId])).rows.length, 0);
      assert.equal((await db.query("select * from trial_claims where organization_id = $1", [who.orgId])).rows.length, 0);
      assert.equal((await db.query("select * from trial_identifiers where identifier_value = $1", [who.email])).rows.length, 0);
    } finally {
      await db.exec("drop trigger fail_trial_start on subscriptions; drop function fail_trial_start();");
    }
    assert.equal((await start(who)).auto_rejected, false);
  });

  await t.test("historical overrides cannot bypass the new one-time allowance", async () => {
    const who = await identity();
    const result = await start(who);
    await rpc(admin.userId, "revoke_trial", [result.request_id, "Repeated abuse"]);
    await db.query(`insert into trial_overrides
      (request_id, identifier_type, identifier_value, reason, granted_by)
      values ($1, 'owner_profile', $2, 'Legacy override', $3)`, [result.request_id, who.userId, admin.userId]);
    assert.equal((await start(who)).auto_rejected, true);
  });

  await t.test("deleting the organization/account preserves trial email history", async () => {
    const who = await identity();
    const result = await start(who);
    await rpc(admin.userId, "revoke_trial", [result.request_id, "Repeated abuse"]);
    await db.query("delete from organizations where id = $1", [who.orgId]);
    await db.query("delete from auth.users where id = $1", [who.userId]);
    const other = await identity(who.email);
    assert.equal((await start(other)).rejection_code, "duplicate_email");
    const request = (await db.query("select * from trial_requests where id = $1", [result.request_id])).rows[0];
    assert.equal(request.organization_id, null);
    assert.equal(request.requester_profile_id, null);
    assert.equal(request.email_snapshot, who.email);
  });

  await t.test("the old approval path cannot bypass eligibility or permissions", async () => {
    const who = await identity();
    await assert.rejects(rpc(who.userId, "activate_approved_trial", [randomUUID(), who.orgId]), /permission denied/);
    await assert.rejects(rpc(who.userId, "review_trial_request", [randomUUID(), "approved", null, null]), /permission denied/);
    assert.equal((await db.query(`select count(*)::int as count from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'submit_trial_request'`)).rows[0].count, 1);
  });
});
