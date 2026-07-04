"use client";

import { applyColorKeyToImageData, normalizeColorKey } from "@/lib/color-key";
import { uploadBuilderImage } from "@/lib/services/storage-service";
import type { LayoutSchema } from "@/types/builder";
import type { ColorKeySettings } from "@/types/color-key";
import type { FrameLayout, FrameNode } from "@/types/frame-template";

type BakeCache = Map<string, Promise<string>>;

const COLOR_KEY_BAKE_VERSION = "v3";

function colorKeySignature(src: string, colorKey: ColorKeySettings) {
  return [
    COLOR_KEY_BAKE_VERSION,
    src,
    colorKey.color,
    colorKey.tolerance,
    colorKey.softness,
    colorKey.smoothness ?? 2,
  ].join("|");
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readImageSource(props: Record<string, unknown>) {
  const value = props.src ?? props.url;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function writeImageSource(
  props: Record<string, unknown>,
  src: string,
): Record<string, unknown> {
  if (typeof props.src === "string") return { ...props, src };
  if (typeof props.url === "string") return { ...props, url: src };
  return { ...props, src };
}

function loadImageFromBlob(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to decode image for background removal."));
    };
    image.src = objectUrl;
  });
}

async function blobFromCanvas(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Unable to export transparent image."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

async function bakeColorKeyImage(
  src: string,
  colorKeyInput: unknown,
  cache: BakeCache,
) {
  const colorKey = normalizeColorKey(colorKeyInput);
  if (!colorKey.enabled) return src;

  const signature = colorKeySignature(src, colorKey);
  const existing = cache.get(signature);
  if (existing) return existing;

  const task = (async () => {
    const response = await fetch(src, { mode: "cors" });
    if (!response.ok) {
      throw new Error("Unable to download image for background removal.");
    }

    const image = await loadImageFromBlob(await response.blob());
    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error("Unable to read image size for background removal.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas is not available in this browser.");

    context.drawImage(image, 0, 0);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    context.putImageData(applyColorKeyToImageData(imageData, colorKey), 0, 0);

    const transparentBlob = await blobFromCanvas(canvas);
    const file = new File(
      [transparentBlob],
      `transparent-${COLOR_KEY_BAKE_VERSION}-${crypto.randomUUID()}.png`,
      { type: "image/png" },
    );
    const uploaded = await uploadBuilderImage(file);
    return uploaded.url;
  })();

  cache.set(signature, task);
  return task;
}

function stripColorKey(props: Record<string, unknown>) {
  const rest = { ...props };
  delete rest.colorKey;
  return rest;
}

async function bakeNodeProps(
  propsInput: unknown,
  cache: BakeCache,
): Promise<Record<string, unknown>> {
  const props = isObjectRecord(propsInput) ? propsInput : {};
  const colorKey = normalizeColorKey(props.colorKey);
  if (!colorKey.enabled) return props;

  const source = readImageSource(props);
  if (!source) return stripColorKey(props);

  const bakedUrl = await bakeColorKeyImage(source, colorKey, cache);
  return stripColorKey(writeImageSource(props, bakedUrl));
}

export async function bakeFrameLayoutColorKeyAssets(
  layout: FrameLayout,
): Promise<FrameLayout> {
  const cache: BakeCache = new Map();
  const nodes = await Promise.all(
    layout.nodes.map(async (node): Promise<FrameNode> => {
      if (node.type !== "background" && node.type !== "image") return node;
      return {
        ...node,
        props: await bakeNodeProps(node.props, cache),
      };
    }),
  );

  return { ...layout, nodes };
}

export async function bakeLayoutSchemaColorKeyAssets(
  schema: LayoutSchema,
): Promise<LayoutSchema> {
  const cache: BakeCache = new Map();
  const pageBackgroundEntries = await Promise.all(
    Object.entries(schema.canvas.pageBackgrounds ?? {}).map(
      async ([page, background]) => {
        if (!background) return [page, background] as const;
        const colorKey = normalizeColorKey(background.colorKey);
        if (!colorKey.enabled || !background.image) {
          return [page, stripColorKey(background)] as const;
        }

        return [
          page,
          {
            ...stripColorKey(background),
            image: await bakeColorKeyImage(background.image, colorKey, cache),
          },
        ] as const;
      },
    ),
  );

  const pages = Object.fromEntries(
    await Promise.all(
      Object.entries(schema.pages).map(async ([page, nodes]) => [
        page,
        await Promise.all(
          nodes.map(async (node) => {
            if (node.type !== "background" && node.type !== "image") {
              return node;
            }
            return {
              ...node,
              props: await bakeNodeProps(node.props, cache),
            };
          }),
        ),
      ]),
    ),
  ) as LayoutSchema["pages"];

  return {
    ...schema,
    canvas: {
      ...schema.canvas,
      pageBackgrounds: Object.fromEntries(pageBackgroundEntries),
    },
    pages,
  };
}
