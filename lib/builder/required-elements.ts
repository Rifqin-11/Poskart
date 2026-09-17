import type {
  BuilderComponentType,
  BuilderNode,
  BuilderPage,
  LayoutSchema,
} from "@/types/builder";

export type MissingRequiredBuilderElement = {
  page: BuilderPage;
  label: string;
};

export type AdaptiveTakePhotoValidation = {
  page: "camera";
  type: "button";
  semanticRole: "camera.capture_or_continue";
  label: "Adaptive Take Photo";
};

function isAdaptiveTakePhotoNode(node: BuilderNode) {
  return isUsableRequiredNode(node, {
    page: "camera",
    type: "button",
    semanticRole: "camera.capture_or_continue",
    label: "Adaptive Take Photo",
  });
}

type RequiredBuilderElement = MissingRequiredBuilderElement & {
  type: BuilderComponentType;
  semanticRole?: string;
};

export const REQUIRED_ELEMENT_PAGE_LABELS: Record<BuilderPage, string> = {
  landing: "Landing",
  tutorial: "Tutorial",
  template: "Template",
  camera: "Camera",
  preview: "Preview",
  thanks: "Thanks",
};

/**
 * Runtime-critical nodes for the kiosk journey. These remain editable and
 * removable in the builder, but a theme cannot be persisted without them.
 */
export const REQUIRED_BUILDER_ELEMENTS: readonly RequiredBuilderElement[] = [
  {
    page: "landing",
    type: "button",
    semanticRole: "landing.start_session",
    label: "Button Start Session",
  },
  {
    page: "tutorial",
    type: "button",
    semanticRole: "tutorial.continue",
    label: "Button Continue",
  },
  {
    page: "template",
    type: "template-list",
    label: "Template Grid",
  },
  {
    page: "template",
    type: "button",
    semanticRole: "template.continue",
    label: "Button Continue ke Camera",
  },
  {
    page: "camera",
    type: "camera-view",
    label: "Camera View",
  },
  {
    page: "camera",
    type: "button",
    semanticRole: "camera.take_photo",
    label: "Button Take Photo",
  },
  {
    page: "camera",
    type: "button",
    semanticRole: "camera.continue",
    label: "Button Continue setelah semua foto",
  },
  {
    page: "preview",
    type: "frame-preview",
    label: "Frame Preview",
  },
  {
    page: "preview",
    type: "button",
    semanticRole: "preview.print",
    label: "Button Print",
  },
  {
    page: "preview",
    type: "button",
    semanticRole: "preview.finish",
    label: "Button Selesai",
  },
] as const;

// Keep validation aligned with the page visibility behavior in the builder:
// legacy schemas hide Tutorial unless it is explicitly enabled.
const DEFAULT_ENABLED_BUILDER_PAGES: readonly BuilderPage[] = [
  "landing",
  "template",
  "camera",
  "preview",
  "thanks",
];

function isBuilderPageEnabled(schema: LayoutSchema, page: BuilderPage) {
  return schema.canvas.enabledPages
    ? schema.canvas.enabledPages.includes(page)
    : DEFAULT_ENABLED_BUILDER_PAGES.includes(page);
}

function isUsableRequiredNode(
  node: BuilderNode,
  requirement: RequiredBuilderElement,
) {
  return (
    node.type === requirement.type &&
    node.visible !== false &&
    node.width > 0 &&
    node.height > 0 &&
    (!requirement.semanticRole ||
      node.props.semanticRole === requirement.semanticRole)
  );
}

export function getMissingRequiredBuilderElements(
  schema: LayoutSchema,
): MissingRequiredBuilderElement[] {
  const cameraHasAdaptive = (schema.pages.camera ?? []).some(
    isAdaptiveTakePhotoNode,
  );

  return REQUIRED_BUILDER_ELEMENTS.filter((requirement) => {
    if (
      cameraHasAdaptive &&
      requirement.page === "camera" &&
      (requirement.semanticRole === "camera.take_photo" ||
        requirement.semanticRole === "camera.continue")
    ) {
      return false;
    }

    if (!isBuilderPageEnabled(schema, requirement.page)) return false;

    const pageNodes = schema.pages[requirement.page] ?? [];
    return !pageNodes.some((node) =>
      isUsableRequiredNode(node, requirement),
    );
  }).map(({ page, label }) => ({ page, label }));
}

export function getAdaptiveTakePhotoValidationError(schema: LayoutSchema) {
  const node = (schema.pages.camera ?? []).find(
    (candidate) => candidate.type === "button" &&
      candidate.props.semanticRole === "camera.capture_or_continue",
  );
  if (!node) return null;

  const before = node.props.src;
  const complete = node.props.completedSrc;
  if (typeof before !== "string" || before.trim().length === 0) {
    return "Adaptive Take Photo membutuhkan gambar sebelum foto lengkap.";
  }
  if (typeof complete !== "string" || complete.trim().length === 0) {
    return "Adaptive Take Photo membutuhkan gambar setelah foto lengkap.";
  }
  return null;
}

export function assertAdaptiveTakePhotoConfiguration(schema: LayoutSchema) {
  const error = getAdaptiveTakePhotoValidationError(schema);
  if (error) throw new Error(error);
}

export function formatMissingRequiredBuilderElements(
  missing: MissingRequiredBuilderElement[],
) {
  const grouped = new Map<BuilderPage, string[]>();

  for (const item of missing) {
    grouped.set(item.page, [...(grouped.get(item.page) ?? []), item.label]);
  }

  return [...grouped.entries()]
    .map(
      ([page, labels]) =>
        `${REQUIRED_ELEMENT_PAGE_LABELS[page]}: ${labels.join(", ")}`,
    )
    .join(" • ");
}

export function assertRequiredBuilderElements(schema: LayoutSchema) {
  assertAdaptiveTakePhotoConfiguration(schema);
  const missing = getMissingRequiredBuilderElements(schema);
  if (missing.length === 0) return;

  throw new Error(
    `Pastikan elemen wajib berikut tersedia dan terlihat sebelum menyimpan. ${formatMissingRequiredBuilderElements(missing)}`,
  );
}
