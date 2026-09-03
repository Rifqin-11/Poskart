"use client";

import { useEffect } from "react";

/**
 * React-friendly body/scroll-container lock so an overlay (dialog, sheet,
 * etc.) can prevent the page behind it from scrolling.
 *
 * This works whether the page scrolls via the document (body/html) or via a
 * dedicated container flagged with `data-admin-scroll` (see AdminShell).
 * Locks are reference-counted per element so concurrently-open overlays do not
 * restore scroll too early when they close out of order.
 */

type LockedNode = HTMLElement;

function lockElement(node: LockedNode) {
  const previous = node.style.overflow;
  node.style.overflow = "hidden";
  // Store the previous value on the node so the last lock holder can restore it.
  (node as HTMLElement & { __poskartScrollPrev?: string }).__poskartScrollPrev =
    previous;
}

function unlockElement(node: LockedNode) {
  const holder = node as HTMLElement & { __poskartScrollPrev?: string };
  const previous = holder.__poskartScrollPrev;
  if (previous !== undefined) {
    node.style.overflow = previous;
    delete holder.__poskartScrollPrev;
  }
}

// module-level counts so stacking overlays behave predictably
const counters = new WeakMap<LockedNode, number>();

function acquire(node: LockedNode) {
  const count = counters.get(node) ?? 0;
  counters.set(node, count + 1);
  if (count === 0) lockElement(node);
}

function release(node: LockedNode) {
  const count = counters.get(node) ?? 0;
  if (count <= 1) {
    counters.delete(node);
    unlockElement(node);
  } else {
    counters.set(node, count - 1);
  }
}

function collectTargets() {
  const targets: LockedNode[] = [];
  targets.push(document.documentElement, document.body);
  document
    .querySelectorAll<HTMLElement>("[data-admin-scroll]")
    .forEach((el) => targets.push(el));
  return targets;
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const targets = collectTargets();
    targets.forEach(acquire);
    return () => {
      targets.forEach(release);
    };
  }, [active]);
}