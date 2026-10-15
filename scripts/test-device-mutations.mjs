// Run: node --test scripts/test-device-mutations.mjs (no database access).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function fixture({ device = { id: "device-1", organization_id: "org-device" }, role = "owner", profileRole = "user", updated = true } = {}) {
  const calls = [];
  const supabase = {
    from(table) {
      const call = { table, filters: [], update: false };
      calls.push(call);
      const query = {
        select() { return query; },
        eq(key, value) { call.filters.push([key, value]); return query; },
        update() { call.update = true; return query; },
        async maybeSingle() {
          return { error: null, data: table === "organization_members"
            ? role ? { role } : null
            : call.update ? updated ? { id: "device-1" } : null : device };
        },
      };
      return query;
    },
  };
  const admin = {
    from(table) {
      const query = {
        update() { return query; }, eq() { return query; },
        async is() { calls.push({ table, revoke: true }); return { error: null }; },
      };
      return query;
    },
    async rpc(name, args) { calls.push({ rpc: name, args }); return { error: null }; },
  };
  const source = readFileSync(new URL("../server/admin/actions/device-actions.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const testModule = { exports: {} };
  const mocks = {
    "@/server/admin/context": {
      getAdminContext: async () => ({ supabase, user: { id: "user-1" } }),
      getAdminProfileRole: async () => profileRole,
      verifyRole: async () => { throw new Error("Must not use first membership"); },
    },
    "@/lib/supabase/admin": { createSupabaseAdminClient: () => admin },
  };
  new Function("exports", "require", "module", compiled)(testModule.exports, (id) => mocks[id] ?? {}, testModule);
  return { actions: testModule.exports, calls };
}

test("delete uses the device organization and explicitly checks membership", async () => {
  const { actions, calls } = fixture();
  await actions.deleteDevice("device-1");
  assert.deepEqual(calls.find(c => c.table === "organization_members").filters,
    [["profile_id", "user-1"], ["organization_id", "org-device"]]);
  assert.equal(calls.find(c => c.rpc).args.p_organization_id, "org-device");
});

test("missing device or insufficient membership cannot revoke credentials or delete", async () => {
  for (const options of [{ device: null }, { role: null }, { role: "designer" }, { role: "partner" }]) {
    const { actions, calls } = fixture(options);
    await assert.rejects(actions.deleteDevice("device-1"));
    assert.equal(calls.some(c => c.revoke || c.rpc), false);
  }
});

test("update is organization scoped and supports admin", async () => {
  const { actions, calls } = fixture({ role: "admin" });
  await actions.updateDevice("device-1", { name: "Updated" });
  assert.deepEqual(calls.find(c => c.update).filters,
    [["id", "device-1"], ["organization_id", "org-device"]]);
});

test("update does not report success when RLS or concurrent deletion affects zero rows", async () => {
  const { actions } = fixture({ updated: false });
  await assert.rejects(actions.updateDevice("device-1", { name: "Updated" }), /akses berubah/);
});

test("platform admin can delete a visible device without organization membership", async () => {
  const { actions, calls } = fixture({ profileRole: "admin", role: null });
  await actions.deleteDevice("device-1");
  assert.equal(calls.find(c => c.rpc).args.p_organization_id, "org-device");
  assert.equal(calls.some(c => c.table === "organization_members"), false);
});

test("platform admin can update a visible device without organization membership", async () => {
  const { actions, calls } = fixture({ profileRole: "admin", role: null });
  await actions.updateDevice("device-1", { name: "Updated" });
  assert.deepEqual(calls.find(c => c.update).filters,
    [["id", "device-1"], ["organization_id", "org-device"]]);
});

test("platform admin still cannot mutate a missing device", async () => {
  const { actions, calls } = fixture({ profileRole: "admin", device: null });
  await assert.rejects(actions.deleteDevice("device-1"));
  assert.equal(calls.some(c => c.revoke || c.rpc), false);
});
