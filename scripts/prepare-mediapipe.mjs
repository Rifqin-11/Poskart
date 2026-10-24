// Keep the browser runtime local (no third-party requests containing test photos).
import { mkdir, cp } from "node:fs/promises";
const target = new URL("../public/mediapipe/wasm/", import.meta.url);
await mkdir(target, { recursive: true });
await cp(new URL("../node_modules/@mediapipe/tasks-vision/wasm/", import.meta.url), target, { recursive: true });
