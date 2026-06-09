import type {
  BuilderCanvas,
  BuilderComponentType,
  BuilderNode,
  BuilderPage,
  LayoutSchema,
} from "@/types/builder";

export const builderPages: BuilderPage[] = [
  "landing",
  "template",
  "camera",
  "preview",
  "thanks",
];

const deprecatedComponentTypes = new Set<string>([
  "stamp",
  "countdown-overlay",
  "flash-overlay",
]);

const overlaySchemaComponentTypes = new Set<BuilderComponentType>([
  "button",
  "qr",
  "qr-link",
  "qr-placeholder",
  "camera-view",
  "photo-result",
  "receipt-preview",
  "frame-preview",
  "template-list",
  "template-preview",
  "return-countdown",
  "session-countdown",
  "payment-countdown",
]);

export function isDeprecatedBuilderNode(node: BuilderNode): boolean {
  return deprecatedComponentTypes.has(node.type);
}

export function isOverlaySchemaNode(node: BuilderNode): boolean {
  return overlaySchemaComponentTypes.has(node.type);
}

export function buildLayoutSchema(
  canvas: BuilderCanvas,
  nodes: BuilderNode[],
): LayoutSchema {
  return sanitizeLayoutSchema({
    version: 1,
    canvas,
    pages: Object.fromEntries(
      builderPages.map((page) => [
        page,
        nodes.filter((node) => node.page === page),
      ]),
    ) as LayoutSchema["pages"],
  });
}

export function sanitizeLayoutSchema(schema: LayoutSchema): LayoutSchema {
  const overlayMode = !!schema.canvas.overlayMode;

  return {
    version: 1,
    canvas: schema.canvas,
    pages: Object.fromEntries(
      builderPages.map((page) => [
        page,
        (schema.pages[page] ?? []).filter((node) => {
          if (isDeprecatedBuilderNode(node)) return false;
          if (!overlayMode) return true;
          return isOverlaySchemaNode(node);
        }),
      ]),
    ) as LayoutSchema["pages"],
  };
}
