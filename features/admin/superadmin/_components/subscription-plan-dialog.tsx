"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { SubscriptionPlan } from "@/types/pricing";

type SubscriptionPlanDialogProps = {
  plan: SubscriptionPlan;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: {
    name: string;
    durationMonths: number;
    basePrice: number;
    includedDevices: number;
    additionalDevicePriceMonthly: number;
    isPublic: boolean;
  }) => void;
};

export function SubscriptionPlanDialog({
  plan,
  submitting,
  onClose,
  onSubmit,
}: SubscriptionPlanDialogProps) {
  const [form, setForm] = useState({
    name: plan.name,
    durationMonths: plan.durationMonths,
    basePrice: plan.basePrice,
    includedDevices: plan.includedDevices,
    additionalDevicePriceMonthly: plan.additionalDevicePriceMonthly,
    isPublic: plan.isPublic,
  });

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Edit ${plan.name}`}
    >
      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!form.name.trim()) {
            toast.error("Plan name is required");
            return;
          }
          if (form.durationMonths < 1 || form.includedDevices < 1) {
            toast.error("Duration and included devices must be at least 1");
            return;
          }
          onSubmit(form);
        }}
      >
        <label className="md:col-span-2 block text-xs font-medium text-zinc-600">
          Plan name
          <Input
            className="mt-1"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Pro plan"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Duration (Months)
          <Input
            className="mt-1"
            type="number"
            min={1}
            value={form.durationMonths}
            onChange={(e) =>
              setForm({ ...form, durationMonths: Number(e.target.value) || 1 })
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Base price (IDR)
          <Input
            className="mt-1"
            type="number"
            min={0}
            value={form.basePrice}
            onChange={(e) =>
              setForm({ ...form, basePrice: Number(e.target.value) || 0 })
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Included devices
          <Input
            className="mt-1"
            type="number"
            min={1}
            value={form.includedDevices}
            onChange={(e) =>
              setForm({ ...form, includedDevices: Number(e.target.value) || 1 })
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Additional device price (monthly)
          <Input
            className="mt-1"
            type="number"
            min={0}
            value={form.additionalDevicePriceMonthly}
            onChange={(e) =>
              setForm({
                ...form,
                additionalDevicePriceMonthly: Number(e.target.value) || 0,
              })
            }
          />
        </label>
        <label className="flex items-end gap-2 text-sm text-zinc-700 md:col-span-2">
          <Switch
            checked={form.isPublic}
            onCheckedChange={(isPublic) => setForm({ ...form, isPublic })}
          />
          Visible publicly on signup pricing selection
        </label>
        <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-zinc-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
