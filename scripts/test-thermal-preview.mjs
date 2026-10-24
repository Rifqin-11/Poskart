// Run: node --test scripts/test-thermal-preview.mjs (no database access).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function load(path, mocks = {}) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const testModule = { exports: {} };
  new Function("exports", "require", "module", code)(testModule.exports, (id) => {
    if (!(id in mocks)) throw new Error(`Unexpected import ${id}`);
    return mocks[id];
  }, testModule);
  return testModule.exports;
}
const photoTone = load("../lib/photo-print-tone.ts");
const { thermalPreviewRaster } = load("../lib/thermal-preview.ts", { "./photo-print-tone": photoTone });
const tuning = load("../lib/printer-tuning.ts");
const options = { brightness: 0, contrast: 0, dotDensity: 1, shadowLift: 0, sharpness: 20, printStyle: "thermal_photo" };
const width = 384, height = 64;
function solid(value, alpha = 255) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < rgba.length; i += 4) {
    rgba.fill(value, i, i + 3); rgba[i + 3] = alpha;
  }
  return rgba;
}
function coverage(pixels) {
  let black = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    assert.ok(pixels[i] === 0 || pixels[i] === 255);
    assert.equal(pixels[i], pixels[i + 1]); assert.equal(pixels[i], pixels[i + 2]);
    assert.equal(pixels[i + 3], 255);
    black += pixels[i] === 0;
  }
  return black / (pixels.length / 4);
}

test("manual shadow lift opens dark areas without modifying the input", () => {
  const source = solid(10), before = source.slice();
  const normal = coverage(thermalPreviewRaster(source, width, height, options));
  const lifted = coverage(thermalPreviewRaster(source, width, height, { ...options, shadowLift: 50 }));
  assert.ok(normal > .95); assert.ok(lifted < .85 && lifted < normal - .15);
  assert.deepEqual(source, before);
});

test("white and transparent pixels stay white in all print styles", () => {
  for (const printStyle of ["smooth", "retro", "thermal_photo"]) {
    for (const source of [solid(255), solid(0, 0)]) {
      assert.equal(coverage(thermalPreviewRaster(source, width, height, { ...options, printStyle, shadowLift: 100 })), 0);
    }
  }
});

test("simulator rejects invalid dimensions and bounds allocation", () => {
  assert.throws(() => thermalPreviewRaster(solid(10), 0, height, options));
  assert.throws(() => thermalPreviewRaster(solid(10), width, height + 1, options));
  assert.throws(() => thermalPreviewRaster(new Uint8ClampedArray(), 576, 10000, options));
});

test("manual curve preserves tone ordering instead of inverting shadows", () => {
  const lift = (v) => v + 110 * (1 - v / 255) ** 2;
  for (let v = 1; v < 256; v++) assert.ok(lift(v) >= lift(v - 1));
  assert.equal(lift(255), 255);
});

test("shadow setting rejects non-finite input and clamps range", () => {
  const { clampPrinterTuningValue: clamp, PRINTER_TUNING_LIMITS: limits } = tuning;
  assert.deepEqual(limits.shadowLift, { min: 0, max: 100, step: 1 });
  for (const [input, expected] of [[undefined, 42], [NaN, 42], [Infinity, 42], ["bad", 42], [-10, 0], [500, 100], ["55", 55]]) {
    assert.equal(clamp(input, 42, 0, 100), expected);
  }
});

async function postSettings(body) {
  const calls = [];
  const context = { organizationId: "org-1", client: { from(table) {
    const call = { table, patch: null, filters: [] }; calls.push(call);
    const query = {
      update(patch) { call.patch = patch; return query; },
      eq(key, value) { call.filters.push([key, value]); return query; },
      then(resolve) { resolve({ error: null }); },
    };
    return query;
  } } };
  const { POST } = load("../app/api/kiosk/device/printer/route.ts", {
    "@/lib/printer-tuning": tuning,
    "@/lib/kiosk/server": {
      requireKioskContext: async () => context,
      requireOrganizationDevice: async (_ctx, deviceId) => {
        assert.equal(deviceId, "device-1");
        return { id: deviceId, printer_shadow_lift: 42, printer_dark_smoothing: 20, printer_local_contrast: 30, printer_background_lift: 40 };
      },
      jsonOk: (data) => data,
      jsonError: (error) => { throw error; },
    },
  });
  await POST(new Request("https://example.test/api/kiosk/device/printer", {
    method: "POST", body: JSON.stringify({ deviceId: "device-1", ...body }),
  }));
  return calls[0];
}

test("old kiosk payload preserves shadow lift; new payload is device/org scoped", async () => {
  const old = await postSettings({ brightness: 10 });
  assert.equal(old.patch.printer_shadow_lift, 42);
  const current = await postSettings({ shadowLift: 65 });
  assert.equal(current.patch.printer_shadow_lift, 65);
  assert.deepEqual(current.filters, [["id", "device-1"], ["organization_id", "org-1"]]);
  assert.equal((await postSettings({ shadowLift: 0 })).patch.printer_shadow_lift, 0);
  assert.equal((await postSettings({ shadowLift: 999 })).patch.printer_shadow_lift, 100);
});

test("new controls preserve omitted values from older kiosks and respect explicit zero", async () => {
  const old = await postSettings({ brightness: 10 });
  assert.equal(old.patch.printer_dark_smoothing, 20);
  assert.equal(old.patch.printer_local_contrast, 30);
  assert.equal(old.patch.printer_background_lift, 40);
  const current = await postSettings({ darkSmoothing: 0, localContrast: 500, backgroundLift: -20 });
  assert.equal(current.patch.printer_dark_smoothing, 0);
  assert.equal(current.patch.printer_local_contrast, 100);
  assert.equal(current.patch.printer_background_lift, 0);
});

test("new controls at zero are exactly the original raster", () => {
  const source = solid(40);
  assert.deepEqual(thermalPreviewRaster(source, width, height, options), thermalPreviewRaster(source, width, height,
    { ...options, darkSmoothing: 0, localContrast: 0, backgroundLift: 0 }));
});

test("dark smoothing opens black backgrounds; segmentation preserves people", () => {
  const source = solid(10), before = source.slice();
  assert.ok(coverage(thermalPreviewRaster(source, width, height, { ...options, darkSmoothing: 100 })) < .8);
  const values = new Float64Array(64).fill(40), people = new Float32Array(64).fill(1);
  const subject = photoTone.photoPrintTone(values, 8, 8, 0, 0, 100, people);
  assert.deepEqual(subject, values);
  const background = photoTone.photoPrintTone(values, 8, 8, 0, 0, 100, new Float32Array(64));
  assert.ok(background.every((v) => v === 255));
  assert.deepEqual(source, before);
});

test("CLAHE is bounded and robust at tiny sizes and flat photos", () => {
  for (const size of [1, 8, 65]) {
    const result = photoTone.photoPrintTone(new Float64Array(size * size).fill(100), size, size, 0, 100);
    assert.ok(result.every((v) => Number.isFinite(v) && v >= 0 && v <= 255));
  }
});

test("photo-tuning migration retains atomic pairing and legacy column", () => {
  const migration = readFileSync(new URL("../supabase/migrations/20261024190000_device_photo_print_tuning.sql", import.meta.url), "utf8");
  for (const field of ["dark_smoothing", "local_contrast", "background_lift"]) {
    assert.ok(migration.includes(`check (printer_${field} between 0 and 100)`));
  }
  assert.match(migration, /for update/);
  assert.match(migration, /pairing.organization_id <> p_organization_id/);
  assert.match(migration, /to service_role/);
  assert.doesNotMatch(migration, /drop column/);
});

test("pairing migration preserves existing checks and adds bounded shadow lift atomically", () => {
  const previous = readFileSync(new URL("../supabase/migrations/20260810150000_device_experience_settings.sql", import.meta.url), "utf8");
  const current = readFileSync(new URL("../supabase/migrations/20261024130000_device_printer_shadow_lift.sql", import.meta.url), "utf8");
  const body = (sql) => sql.slice(sql.indexOf("create or replace function"));
  const expected = body(previous)
    .replace("printer_dot_density, settings_pin", "printer_dot_density, printer_shadow_lift, settings_pin")
    .replace("    case when normalized_pin", "    greatest(0, least(100, coalesce((p_device ->> 'printerShadowLift')::numeric, 0))),\n    case when normalized_pin");
  assert.equal(body(current), expected);
  assert.match(current, /printer_shadow_lift numeric not null default 0/);
  assert.match(current, /check \(printer_shadow_lift between 0 and 100\)/);
});
