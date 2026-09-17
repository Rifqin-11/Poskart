"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Returns true once the referenced element is within `rootMargin` of the
 * viewport (and stays true afterwards).
 *
 * Used to keep heavy animation setup — GSAP timelines, ScrollTrigger
 * registration, and their geometry reads — out of the initial load window so
 * they do not compete with the hero's Largest Contentful Paint.
 */
export function useNearViewport(
  ref: RefObject<Element | null>,
  rootMargin = "400px 0px",
) {
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (near) return;
    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver === "undefined") {
      // Legacy browsers without IntersectionObserver initialize immediately.
      const timer = window.setTimeout(() => setNear(true), 0);
      return () => window.clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [near, ref, rootMargin]);

  return near;
}
