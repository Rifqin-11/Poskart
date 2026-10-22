"use client";

import { Dialog } from "@/components/ui/dialog";
import { TrialContent } from "@/features/admin/trial/trial-content";
import type { TrialEligibility } from "@/types/trial";

export function TrialDialog({
  open,
  onOpenChange,
  eligibility,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eligibility: TrialEligibility | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Trial POSKART">
      <TrialContent eligibility={eligibility} onStarted={() => onOpenChange(false)} />
    </Dialog>
  );
}
