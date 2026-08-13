import type { FrameLayout } from "@/types/frame-template";

export const FRAME_PHOTO_SLOT_REQUIRED_MESSAGE =
  "Tambahkan minimal satu Photo Slot sebelum menyimpan frame.";

type FrameLayoutLike = FrameLayout | Record<string, unknown> | null | undefined;

function isUsablePhotoSlot(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const node = value as Record<string, unknown>;
  return (
    node.type === "photo-slot" &&
    typeof node.width === "number" &&
    Number.isFinite(node.width) &&
    node.width > 0 &&
    typeof node.height === "number" &&
    Number.isFinite(node.height) &&
    node.height > 0
  );
}

export function countUsableFramePhotoSlots(layout: FrameLayoutLike) {
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) return 0;

  const nodes = (layout as Record<string, unknown>).nodes;
  if (!Array.isArray(nodes)) return 0;
  return nodes.filter(isUsablePhotoSlot).length;
}

export function assertFrameHasPhotoSlot(layout: FrameLayoutLike) {
  if (countUsableFramePhotoSlots(layout) > 0) return;
  throw new Error(FRAME_PHOTO_SLOT_REQUIRED_MESSAGE);
}
