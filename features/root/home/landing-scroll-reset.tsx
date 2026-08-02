"use client";

import { useEffect } from "react";

export function LandingScrollReset() {
  useEffect(() => {
    const { history } = window;
    const previousScrollRestoration = history.scrollRestoration;

    history.scrollRestoration = "manual";

    const resetScroll = () => {
      if (window.location.hash) return;

      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });
    };

    resetScroll();
    const frame = window.requestAnimationFrame(resetScroll);
    window.addEventListener("pageshow", resetScroll);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pageshow", resetScroll);
      history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  return null;
}
