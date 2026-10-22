"use client";

import { TrialContent } from "@/features/admin/trial/trial-content";
import type { TrialEligibility } from "@/types/trial";

export function TrialPage({ eligibility }: { eligibility: TrialEligibility }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <TrialContent eligibility={eligibility} />
    </div>
  );
}
