"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/**
 * The toast layer imports `goey-toast`, which pulls the Framer Motion runtime
 * (~66 KB raw plus its peer). That work is irrelevant to the first paint of the
 * landing page, so the module is loaded after the browser is idle.
 *
 * Toasts are only triggered by user interaction, which always happens after
 * this has mounted.
 */
const Toaster = dynamic(
  () => import("@/components/ui/sonner").then((mod) => mod.Toaster),
  { ssr: false },
);

export function DeferredToaster() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const enable = () => {
      if (!cancelled) setReady(true);
    };

    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
    };
    const idleWindow = window as IdleWindow;

    // Two seconds is a safety net for browsers without requestIdleCallback.
    const timeout = window.setTimeout(enable, 2000);
    if (typeof idleWindow.requestIdleCallback === "function") {
      idleWindow.requestIdleCallback(enable, { timeout: 2000 });
    } else {
      enable();
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, []);

  if (!ready) return null;
  return <Toaster />;
}
