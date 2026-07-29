"use client";

import { useEffect, useState } from "react";

const PORTRAIT_BUILDER_QUERY =
  "(max-width: 1099px) and (orientation: portrait)";

export function useBuilderResponsiveMode() {
  const [isPortraitBuilder, setIsPortraitBuilder] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(PORTRAIT_BUILDER_QUERY);
    const updateMode = () => setIsPortraitBuilder(mediaQuery.matches);

    updateMode();
    mediaQuery.addEventListener("change", updateMode);
    return () => mediaQuery.removeEventListener("change", updateMode);
  }, []);

  return { isPortraitBuilder };
}
