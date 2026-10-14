import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);

function actions({ enabled = true, style = "packaging", role = "owner", error = null } = {}) {
  const calls = [];
  const query = {
    select: () => query,
    eq: (column, value) => { calls.push([column, value]); return query; },
    update: (value) => { calls.push(value); return query; },
    single: async () => ({ data: { gallery_unboxing_enabled: enabled, gallery_unboxing_style: style }, error }),
  };
  const supabase = { from: () => query };
  const source = readFileSync(new URL("server/admin/actions/gallery-experience-actions.ts", root), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const testModule = { exports: {} };
  const dependencies = {
    "next/cache": { revalidatePath: (path) => calls.push(path) },
    "@/server/admin/context": {
      getAdminContext: async () => ({ supabase }),
      getAdminMembership: async () => ({ organizationId: "org-one", role }),
      verifyRole: async (allowed) => {
        if (!allowed.includes(role)) throw new Error("Unauthorized");
        return { supabase, organizationId: "org-one" };
      },
    },
  };
  new Function("exports", "require", compiled)(testModule.exports, (id) => dependencies[id]);
  return { ...testModule.exports, calls };
}

test("experience preserves explicit false and defaults legacy values to true", async () => {
  assert.equal((await actions({ enabled: false }).getGalleryExperience()).unboxingEnabled, false);
  assert.equal((await actions({ enabled: null }).getGalleryExperience()).unboxingEnabled, true);
});

test("experience supports both packaging and envelope styles", async () => {
  assert.equal((await actions({ style: "packaging" }).getGalleryExperience()).unboxingStyle, "packaging");
  assert.equal((await actions({ style: "envelope" }).getGalleryExperience()).unboxingStyle, "envelope");
  const api = actions({ style: "envelope" });
  await api.updateGalleryExperience({ enabled: true, style: "envelope" });
  assert.ok(api.calls.some((call) => call.gallery_unboxing_style === "envelope"));
});

test("owner/admin can save an organization-scoped toggle", async () => {
  for (const role of ["owner", "admin"]) {
    const api = actions({ role, enabled: false });
    assert.equal((await api.updateGalleryExperience(false)).unboxingEnabled, false);
    assert.ok(api.calls.some((call) => call.gallery_unboxing_enabled === false));
    assert.ok(api.calls.some((call) => Array.isArray(call) && call[0] === "id" && call[1] === "org-one"));
    assert.ok(api.calls.includes("/gallery"));
  }
});

test("other roles are read-only and cannot mutate", async () => {
  const api = actions({ role: "designer" });
  assert.equal((await api.getGalleryExperience()).canEdit, false);
  await assert.rejects(api.updateGalleryExperience(false), /Unauthorized/);
  assert.equal(api.calls.filter((call) => call.gallery_unboxing_enabled !== undefined).length, 0);
});

test("invalid inputs and database failures cannot report success", async () => {
  await assert.rejects(actions().updateGalleryExperience("false"), /tidak valid/);
  await assert.rejects(actions({ error: { message: "failure" } }).updateGalleryExperience(false), /belum dapat disimpan/);
  await assert.rejects(actions({ error: { message: "failure" } }).getGalleryExperience(), /belum dapat dimuat/);
});
