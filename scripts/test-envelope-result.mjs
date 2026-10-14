import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function load() {
  const steps = [];
  let options;
  const timeline = { fromTo(target, from, to, position) { steps.push({ target, from, to, position }); return timeline; } };
  const source = readFileSync(new URL("../features/public/gallery/envelope-result-timeline.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function("exports", "require", compiled)(module.exports, () => ({ timeline(value) { options = value; return timeline; } }));
  return { ...module.exports, steps, options: () => options };
}
const element = (left, top, width, height) => ({ getBoundingClientRect: () => ({ left, top, width, height }) });

test("captures visible portrait and landscape bounds instead of letterboxing", () => {
  const { getContainedPhotoBounds } = load();
  assert.deepEqual(getContainedPhotoBounds({ ...element(10, 20, 200, 160), naturalWidth: 600, naturalHeight: 1200 }), { left: 70, top: 20, width: 80, height: 160 });
  assert.deepEqual(getContainedPhotoBounds({ ...element(10, 20, 200, 160), naturalWidth: 1200, naturalHeight: 600 }), { left: 10, top: 50, width: 200, height: 100 });
});

test("paper backing and photo smoothly grow together with no layout-property tweens", () => {
  const api = load();
  const complete = () => {};
  api.createEnvelopeResultTimeline(element(20, 200, 320, 400), element(60, 210, 200, 300), {
    backing: { left: 40, top: 300, width: 200, height: 160 },
    image: { left: 100, top: 310, width: 80, height: 120 },
  }, complete);
  assert.equal(api.options().onComplete, complete);
  assert.equal(api.options().defaults.duration, .85);
  assert.equal(api.steps.length, 2);
  assert.deepEqual(api.steps[0].from, { transformOrigin: "0 0", x: 20, y: 100, scaleX: .625, scaleY: .4 });
  assert.deepEqual(api.steps[1].from, { transformOrigin: "0 0", x: 40, y: 100, scaleX: .4, scaleY: .4 });
  for (const { to, position } of api.steps) {
    assert.equal(position, 0);
    assert.deepEqual(to, { x: 0, y: 0, scaleX: 1, scaleY: 1, clearProps: "transform,transformOrigin" });
  }
});

test("reduced motion skips enlargement duration and missing images still reveal backing", () => {
  const api = load();
  api.createEnvelopeResultTimeline(element(0, 0, 320, 400), null, { backing: { left: 0, top: 0, width: 200, height: 160 } }, () => {}, true);
  assert.equal(api.options().defaults.duration, 0);
  assert.equal(api.steps.length, 1);
});
