"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./home-closing.module.css";

gsap.registerPlugin(ScrollTrigger);

/**
 * Homepage closing sequence.
 *
 * Desktop
 * -------
 * The CTA scrolls below the FAQ, then sticks with its bottom 200px above the
 * viewport edge. The normal-flow footer approaches and covers one quarter of
 * the card before the sticky container releases. No transforms or pin swaps.
 *
 * The layout switch lives in `home-closing.module.css` behind `data-active`, so:
 * - before hydration (and if JS fails) the footer stays in normal flow;
 * - under `prefers-reduced-motion` the footer also stays in normal flow;
 * - only when the scroll timeline is wired is the desktop spacing enabled.
 *
 * Mobile
 * ------
 * No hold: the footer follows the backdrop and overlaps it slightly.
 */
export function HomeClosingSequence({
  cta,
  footer,
}: {
  cta: React.ReactNode;
  footer: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const cta = ctaRef.current;
    const reveal = revealRef.current;
    const footer = footerRef.current;
    if (!root || !cta || !reveal || !footer) return;

    const context = gsap.context(() => {
      const media = gsap.matchMedia();

      /*
       * Never return `media.revert()` from these callbacks: a matchMedia context
       * already reverts everything it created when the query stops matching, and
       * calling revert() from inside its own cleanup recurses until the stack
       * overflows.
       */
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(reveal, {
          opacity: 0,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: {
            trigger: root,
            start: "top 82%",
            once: true,
          },
        });
      });

      media.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        root.dataset.active = "true";
        const backdrop = cta.parentElement;
        if (!backdrop) return;
        const syncLayout = () => {
          root.style.setProperty("--closing-card-h", `${cta.offsetHeight}px`);
          root.style.setProperty("--closing-overlap", `${cta.offsetHeight * .25}px`);
          root.style.setProperty("--closing-travel", `${280 + cta.offsetHeight * .25}px`);
          root.style.setProperty("--closing-top", `${Math.max(96, window.innerHeight - cta.offsetHeight - 232)}px`);
        };
        syncLayout();
        ScrollTrigger.addEventListener("refreshInit", syncLayout);
        const observer = new ResizeObserver(syncLayout);
        observer.observe(cta);
        window.addEventListener("resize", syncLayout);
        const refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
        return () => {
          cancelAnimationFrame(refreshFrame);
          ScrollTrigger.removeEventListener("refreshInit", syncLayout);
          observer.disconnect();
          window.removeEventListener("resize", syncLayout);
          delete root.dataset.active;
          ["--closing-card-h", "--closing-overlap", "--closing-travel", "--closing-top"].forEach(property => root.style.removeProperty(property));
        };
      });
    }, root);

    return () => context.revert();
  }, []);

  return (
    <div ref={rootRef} className={`home-closing-root relative ${styles.root}`}>
      <div className={`home-closing-stage ${styles.stage}`}>
        {/* Gradient backdrop and the banner that stays put. */}
        <div className={`home-closing-backdrop relative bg-[linear-gradient(180deg,#FFFFFF_0%,#EDF0F4_50%,#CFD5DD_100%)] px-3 py-4 sm:px-6 sm:py-6 ${styles.backdrop}`}>
          <div ref={ctaRef} className="w-full will-change-transform">
            <div ref={revealRef}>{cta}</div>
          </div>
        </div>
      </div>
        {/* Footer sheet that rises from below on scroll. */}
        <div
          ref={footerRef}
          className={`home-closing-footer relative z-10 -mt-24 will-change-transform sm:-mt-32 ${styles.footer}`}
        >
          {footer}
        </div>
    </div>
  );
}
