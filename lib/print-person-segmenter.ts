// Loaded only for a user-enabled background slider. Input never leaves browser.
const cache = new WeakMap<HTMLCanvasElement, Promise<HTMLCanvasElement>>();

async function infer(source: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
  const files = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
  const segmenter = await ImageSegmenter.createFromOptions(files, {
    baseOptions: { modelAssetPath: "/mediapipe/selfie_segmenter.tflite", delegate: "CPU" },
    runningMode: "IMAGE", outputConfidenceMasks: true, outputCategoryMask: false,
  });
  try {
    const input = document.createElement("canvas");
    input.width = Math.min(576, source.width);
    input.height = Math.max(1, Math.round(source.height * input.width / source.width));
    const ctx = input.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(source, 0, 0, input.width, input.height);
    const canvas = document.createElement("canvas");
    segmenter.segment(input, (result) => {
      const mask = result.confidenceMasks?.[0]; // Selfie model has one foreground channel.
      if (!mask) throw new Error("Person mask unavailable");
      canvas.width = mask.width; canvas.height = mask.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");
      const data = context.createImageData(mask.width, mask.height);
      const values = mask.getAsFloat32Array();
      for (let i = 0; i < values.length; i++) {
        const value = Math.trunc(Math.min(1, Math.max(0, values[i])) * 255);
        data.data.fill(value, i * 4, i * 4 + 3); data.data[i * 4 + 3] = 255;
      }
      context.putImageData(data, 0, 0);
    });
    return canvas;
  } finally { segmenter.close(); }
}

export async function printPersonMask(source: HTMLCanvasElement, width: number, height: number) {
  let pending = cache.get(source);
  if (!pending) {
    pending = infer(source);
    cache.set(source, pending);
    pending.catch(() => cache.delete(source));
  }
  const mask = await pending;
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(mask, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height).data;
  return Float32Array.from({ length: width * height }, (_, i) => pixels[i * 4] / 255);
}
