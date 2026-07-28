"use client";

import { useCallback, useEffect, useState } from "react";

export type FeatureTutorialScope =
  | "finance"
  | "pricing"
  | "devices"
  | "gallery"
  | "vouchers";

export function useFeatureTutorial(scope: FeatureTutorialScope) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetch(`/api/admin/tutorial?scope=${scope}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { completed?: boolean };
      })
      .then((progress) => {
        if (!cancelled && progress?.completed === false) {
          setOpen(true);
        }
      })
      .catch(() => {
        // Feature pages must remain usable if tutorial progress is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [scope]);

  const complete = useCallback(() => {
    setOpen(false);
    void fetch(`/api/admin/tutorial?scope=${scope}`, {
      method: "PUT",
      cache: "no-store",
    });
  }, [scope]);

  return {
    open,
    show: () => setOpen(true),
    complete,
  };
}
