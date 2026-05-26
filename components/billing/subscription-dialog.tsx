"use client";

import { PricingCards } from "@/components/pricing/pricing-cards";
import { Dialog } from "@/components/ui/dialog";
import { businessProfile } from "@/lib/constants/business";

export function SubscriptionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Change subscription"
      className="max-h-[90vh] max-w-6xl overflow-y-auto"
    >
      <div className="space-y-5">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight">Choose a POSKART subscription plan.</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
            Pilih paket langganan tanpa keluar dari dashboard. Setelah memilih paket, checkout tetap berjalan di area admin.
          </p>
        </div>
        <PricingCards />
      </div>
    </Dialog>
  );
}
