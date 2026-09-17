"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Homepage closing sequence.
 *
 * Desktop
 * -------
 * The stage is one viewport tall and `position: sticky`, and the root reserves
 * extra scroll height equal to the measured footer height. So the CTA appears
 * to stop at the top of the screen, and the remaining scroll is spent sliding
 * the white footer sheet up from below until it settles over the lower part of
 * the banner.
 *
 * The layout switch lives in `app/globals.css` behind `data-active`, so:
 * - before hydration (and if JS fails) the footer stays in normal flow;
 * - under `prefers-reduced-motion` the footer also stays in normal flow;
 * - only when the scroll timeline is actually wired does the stage pin.
 *
 * Sticky is used instead of a GSAP pin so the document height never changes,
 * which keeps fast scrolling and mid-visit refreshes stable.
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
          y: 26,
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
        // Reserve exactly as much scroll as the footer needs to travel, and keep
        // that measurement in sync when the viewport or footer content changes.
        const syncHeight = () => {
          root.style.setProperty("--home-footer-height", `${footer.offsetHeight}px`);
        };

        syncHeight();
        gsap.set(footer, { yPercent: 100 });
        root.dataset.active = "true";
        ScrollTrigger.addEventListener("refreshInit", syncHeight);
        ScrollTrigger.refresh();

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.5,
            invalidateOnRefresh: true,
          },
        });

        timeline.to(cta, { y: -26, ease: "none" }, 0);
        timeline.to(footer, { yPercent: 0, ease: "none" }, 0);

        return () => {
          ScrollTrigger.removeEventListener("refreshInit", syncHeight);
          delete root.dataset.active;
          root.style.removeProperty("--home-footer-height");
        };
      });
    }, root);

    return () => context.revert();
  }, []);

  return (
    <div ref={rootRef} className="home-closing-root relative">
      <div className="home-closing-stage">
        {/* Gradient backdrop and the banner that stays put. */}
        <div className="home-closing-backdrop relative bg-[linear-gradient(180deg,#FFFFFF_0%,#EDF0F4_50%,#CFD5DD_100%)] px-3 py-16 sm:px-6 sm:py-20">
          <div ref={ctaRef} className="w-full will-change-transform">
            <div ref={revealRef}>{cta}</div>
          </div>
        </div>

        {/* Footer sheet that rises from below on scroll. */}
        <div
          ref={footerRef}
          className="home-closing-footer relative z-10 -mt-24 will-change-transform sm:-mt-32"
        >
          {footer}
        </div>
      </div>
    </div>
  );
}
