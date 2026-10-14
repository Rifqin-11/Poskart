import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const layers = { seal: "wax", flap: "flap", flapLayer: "flap-layer", rear: "rear", pocket: "pocket", photo: "photo" };
function record(reducedMotion = false) {
  const steps = [];
  const labels = {};
  let end = 0;
  function position(value = end) {
    if (typeof value === "number") return value;
    const [label, offset = 0] = value.split("+=");
    assert.ok(label in labels, `Unknown timeline label: ${label}`);
    return labels[label] + Number(offset);
  }
  const timeline = {
    addLabel(name, value) { labels[name] = position(value); return timeline; },
    to(target, vars, value) { const start = position(value); steps.push({ target, vars, start }); end = Math.max(end, start + (vars.duration ?? 0)); return timeline; },
    set(target, vars, value) { steps.push({ target, vars, start: position(value) }); return timeline; },
  };
  let options;
  const source = readFileSync(new URL("features/public/gallery/envelope-opening-timeline.ts", root), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const compiledModule = { exports: {} };
  new Function("exports", "require", compiled)(compiledModule.exports, () => ({ timeline: (value) => { options = value; return timeline; } }));
  const complete = () => {};
  compiledModule.exports.createEnvelopeOpeningTimeline(layers, complete, reducedMotion);
  return { steps, labels, options, complete };
}

test("photo stays stationary and is visible before the flap finishes opening", () => {
  const { steps, labels } = record();
  const photo = steps.filter(({ target }) => target === layers.photo);
  assert.deepEqual(photo, [{ target: layers.photo, vars: { opacity: 1 }, start: labels.openFlap }]);
  assert.ok(labels.openFlap < labels.photoInEnvelope);
  // No translate, scale, rotation, or transform animation of the photo.
  assert.ok(photo.every(({ vars }) => Object.keys(vars).every((key) => key === "opacity")));
});

test("flap opens completely from the top fold, then passes behind the photo", () => {
  const { steps, labels } = record();
  const flap = steps.find(({ target, vars }) => target === layers.flap && vars.rotationX !== undefined);
  assert.equal(flap.vars.rotationX, -180);
  const stacking = steps.find(({ vars }) => vars.zIndex === 1);
  assert.equal(stacking.target, layers.flapLayer);
  assert.equal(stacking.start, labels.openFlap + flap.vars.duration / 2);
  const css = readFileSync(new URL("features/public/gallery/gallery-unboxing.module.css", root), "utf8");
  assert.match(css, /transform-origin: 50% 0%/);
  assert.match(css, /\.envelopeCard\s*\{[^}]*transform: none/);
  assert.match(css, /backface-visibility: hidden/);
});

test("paper holds open before all envelope layers descend together and fade late", () => {
  const { steps, labels, options, complete } = record();
  assert.ok(labels.envelopeDrops - labels.photoInEnvelope >= .6);
  const drop = steps.find(({ vars }) => vars.yPercent !== undefined);
  const fade = steps.find(({ target, vars }) => Array.isArray(target) && vars.opacity === 0);
  assert.deepEqual(drop.target, [layers.rear, layers.pocket, layers.flapLayer]);
  assert.deepEqual(fade.target, drop.target);
  assert.ok(drop.vars.yPercent > 0);
  assert.ok(fade.start > drop.start);
  assert.equal(options.onComplete, complete);
});

test("reduced motion reveals the photo without movement or a timed hold", () => {
  const { steps } = record(true);
  assert.equal(steps.length, 2);
  assert.ok(steps.every(({ start }) => start === 0));
  assert.deepEqual(steps[0], { target: layers.photo, vars: { opacity: 1 }, start: 0 });
  assert.deepEqual(steps[1].target, [layers.rear, layers.pocket, layers.flapLayer, layers.seal]);
  assert.deepEqual(steps[1].vars, { opacity: 0 });
});

test("transparent registered paper layers do not contain baked-in wax", async () => {
  for (const name of ["inside", "pocket", "flap", "flap-inside", "wax"]) {
    const path = new URL(`public/landing/gallery-envelope-${name}.webp`, root);
    const { data, info } = await sharp(fileURLToPath(path)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.channels, 4);
    const alpha = (x, y) => data[(y * info.width + x) * 4 + 3];
    assert.equal(alpha(info.width - 1, info.height - 1), 0, `${name}: opaque outer background`);
    assert.ok(data.some((value, index) => index % 4 === 3 && value > 200), `${name}: empty asset`);
    if (name === "inside" || name === "pocket") assert.equal(info.width, 1145);
    if (name === "flap") { assert.equal(info.width, 1052); assert.equal(info.height, 470); }
    if (name !== "wax") {
      let burgundy = 0;
      for (let index = 0; index < data.length; index += 4) {
        if (data[index + 3] > 200 && data[index] - Math.max(data[index + 1], data[index + 2]) > 45 && data[index + 1] < 90) burgundy++;
      }
      assert.equal(burgundy, 0, `${name}: wax is still baked into paper`);
    }
    if (name === "pocket") assert.equal(alpha(572, 550), 0, "Photo opening is not transparent");
  }
});


test("reverse flap face is mirrored so its wide edge stays attached to the fold", async () => {
  const coverage = async (name, row) => {
    const { data, info } = await sharp(fileURLToPath(new URL(`public/landing/gallery-envelope-${name}.webp`, root))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, 1052);
    assert.equal(info.height, 470);
    let opaque = 0;
    for (let x = 0; x < info.width; x++) if (data[(row * info.width + x) * 4 + 3] > 200) opaque++;
    return opaque;
  };
  assert.ok(await coverage("flap", 20) > 950);
  assert.ok(await coverage("flap", 449) < 120);
  assert.ok(await coverage("flap-inside", 20) < 120);
  assert.ok(await coverage("flap-inside", 449) > 950);
  const css = readFileSync(new URL("features/public/gallery/gallery-unboxing.module.css", root), "utf8");
  assert.match(css, /\.envelopeOverlay\s*\{[^}]*scrollbar-gutter: stable both-edges/);
});
