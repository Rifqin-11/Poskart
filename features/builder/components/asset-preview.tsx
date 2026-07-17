"use client";

import { useState } from "react";
import { getColorKeyImageSourceCandidates } from "@/features/builder/utils/color-key-image-source";

export function AssetPreview({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const candidates = getColorKeyImageSourceCandidates(src);
  const candidate = candidates[candidateIndex] ?? src;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={candidate}
      alt={alt}
      className={className}
      onError={() => {
        if (candidateIndex < candidates.length - 1) {
          setCandidateIndex((index) => index + 1);
        }
      }}
    />
  );
}
