import gsap from "gsap";

type Bounds = { left: number; top: number; width: number; height: number };
export type EnvelopeResultBounds = { backing: Bounds; image?: Bounds };

// object-fit contains the photo inside a wider paper card. Capture the actual
// visible photograph, not its letterboxed <img> element, before changing layout.
export function getContainedPhotoBounds(image: HTMLImageElement): Bounds {
  const bounds = image.getBoundingClientRect();
  if (!image.naturalWidth || !image.naturalHeight) return bounds;
  const scale = Math.min(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  return { left: bounds.left + (bounds.width - width) / 2, top: bounds.top + (bounds.height - height) / 2, width, height };
}

export function createEnvelopeResultTimeline(backing: HTMLDivElement, image: HTMLImageElement | null, before: EnvelopeResultBounds, onComplete: () => void, reducedMotion = false) {
  const timeline = gsap.timeline({ onComplete, defaults: { duration: reducedMotion ? 0 : .85, ease: "power2.inOut" } });
  const targets = [{ element: backing, before: before.backing }, ...(image && before.image ? [{ element: image, before: before.image }] : [])];
  for (const target of targets) {
    const after = target.element.getBoundingClientRect();
    if (!after.width || !after.height) continue;
    timeline.fromTo(target.element, {
      transformOrigin: "0 0",
      x: target.before.left - after.left,
      y: target.before.top - after.top,
      scaleX: target.before.width / after.width,
      scaleY: target.before.height / after.height,
    }, { x: 0, y: 0, scaleX: 1, scaleY: 1, clearProps: "transform,transformOrigin" }, 0);
  }
  return timeline;
}
