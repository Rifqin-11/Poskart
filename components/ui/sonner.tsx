"use client";

import { GooeyToaster } from "goey-toast";
import "goey-toast/styles.css";

export function Toaster() {
  return (
    <GooeyToaster
      position="top-right"
      theme="light"
      offset="24px"
      gap={12}
      visibleToasts={4}
      duration={4800}
      preset="smooth"
      bounce={0.18}
      closeButton="top-right"
      showProgress
      showTimestamp={false}
    />
  );
}
