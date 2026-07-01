"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DialogActions } from "@/features/admin/_components/dialog-actions";
import { pricingPlans } from "@/lib/constants/business";
import { formatCurrency } from "@/lib/utils";
import type { Organization } from "@/types/organization";
import type { SubscriptionPlan } from "@/types/pricing";
import type { TenantInput } from "@/features/admin/superadmin/api";

type TenantFormDialogProps = {
  title: string;
  initial: TenantInput | Organization;
  subscriptionPlans: SubscriptionPlan[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: TenantInput) => void;
};

function getSubscriptionPlanOptions(plans: SubscriptionPlan[]) {
  const normalizedPlans =
    plans.length > 0
      ? plans
      : pricingPlans.map((plan) => ({
          id: plan.id,
          name: plan.name,
          durationMonths: plan.durationMonths,
          basePrice: plan.amount,
          includedDevices: plan.includedDevices,
        }));

  return [
    { id: "free", label: "Free Account", description: "1 device" },
    ...normalizedPlans.map((plan) => ({
      id: plan.id,
      label: plan.name,
      description: `${plan.durationMonths} month${plan.durationMonths > 1 ? "s" : ""} · ${formatCurrency(plan.basePrice)} · ${plan.includedDevices} device${plan.includedDevices > 1 ? "s" : ""} included`,
    })),
  ];
}

export function TenantFormDialog({
  title,
  initial,
  subscriptionPlans,
  submitting,
  onClose,
  onSubmit,
}: TenantFormDialogProps) {
  const [form, setForm] = useState<TenantInput>(() => {
    const { id: _ignored, ...rest } = initial as Organization;
    void _ignored;
    return {
      name: rest.name || "",
      plan: rest.plan || "Free",
      status: rest.status || "active",
      devices: rest.devices || 0,
      users: rest.users || 1,
      renewalDate: rest.renewalDate || new Date().toISOString().slice(0, 10),
      planId: rest.planId || "free",
      subscriptionStatus: rest.subscriptionStatus || "free",
      subscriptionExpiresAt: rest.subscriptionExpiresAt || null,
      deviceLimit: rest.deviceLimit || 1,
    } as TenantInput;
  });

  const selectedSubscriptionPlan = subscriptionPlans.find(
    (plan) => plan.id === form.planId,
  );
  const fallbackPlan = pricingPlans.find((plan) => plan.id === form.planId);
  const includedDeviceCount =
    selectedSubscriptionPlan?.includedDevices ??
    fallbackPlan?.includedDevices ??
    1;
  const planOptions = getSubscriptionPlanOptions(subscriptionPlans);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={title}>
      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name.trim()) {
            toast.error("Name is required");
            return;
          }
          if ((form.deviceLimit ?? 1) < 1) {
            toast.error("Device limit must be at least 1");
            return;
          }
          if ((form.devices ?? 0) > (form.deviceLimit ?? 1)) {
            toast.error("Device limit cannot be lower than existing devices");
            return;
          }
          onSubmit(form);
        }}
      >
        <label className="md:col-span-2 block text-xs font-medium text-zinc-600">
          Organization Name
          <Input
            className="mt-1"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="PT Photo Device Indonesia"
          />
        </label>

        <label className="block text-xs font-medium text-zinc-600">
          Subscription Plan
          <Select
            className="mt-1"
            value={form.planId || "free"}
            onChange={(e) => {
              const val = e.target.value;
              const selected =
                subscriptionPlans.find((plan) => plan.id === val) ??
                pricingPlans.find((plan) => plan.id === val);
              const includedDevices = selected?.includedDevices ?? 1;
              setForm({
                ...form,
                planId: val,
                plan: val === "free" ? "Free" : (selected?.name ?? "Free"),
                subscriptionStatus:
                  val === "free"
                    ? "free"
                    : form.subscriptionStatus === "free"
                      ? "active"
                      : form.subscriptionStatus,
                deviceLimit: Math.max(includedDevices, form.devices ?? 0),
              });
            }}
          >
            {planOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ({option.description})
              </option>
            ))}
          </Select>
        </label>

        <label className="block text-xs font-medium text-zinc-600">
          Subscription Status
          <Select
            className="mt-1"
            value={form.subscriptionStatus || "free"}
            onChange={(e) =>
              setForm({ ...form, subscriptionStatus: e.target.value })
            }
          >
            <option value="free">Free</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past Due</option>
            <option value="canceled">Canceled</option>
          </Select>
        </label>

        <label className="block text-xs font-medium text-zinc-600">
          Workspace Status (Platform level)
          <Select
            className="mt-1"
            value={form.status}
            onChange={(e) =>
              setForm({
                ...form,
                status: e.target.value as Organization["status"],
              })
            }
          >
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="paused">Paused</option>
          </Select>
        </label>

        <label className="block text-xs font-medium text-zinc-600">
          Subscription Expiry Date
          <Input
            className="mt-1"
            type="date"
            value={
              form.subscriptionExpiresAt
                ? new Date(form.subscriptionExpiresAt)
                    .toISOString()
                    .slice(0, 10)
                : ""
            }
            onChange={(e) =>
              setForm({
                ...form,
                subscriptionExpiresAt: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : null,
              })
            }
          />
        </label>

        <label className="block text-xs font-medium text-zinc-600">
          Paid Device Limit
          <Input
            className="mt-1"
            type="number"
            min={1}
            value={form.deviceLimit ?? 1}
            onChange={(e) =>
              setForm({
                ...form,
                deviceLimit: Math.max(1, Number(e.target.value) || 1),
              })
            }
          />
        </label>

        <div className="md:col-span-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-[11px] leading-5 text-zinc-500">
          {selectedSubscriptionPlan
            ? `${selectedSubscriptionPlan.name} includes ${includedDeviceCount} device${includedDeviceCount > 1 ? "s" : ""}. `
            : "Free Account includes 1 device. "}
          Additional devices are billed at Rp 50K/device/month and should be
          reflected in this paid device limit.
        </div>

        <div className="border-t border-zinc-100 pt-2 md:col-span-2">
          <DialogActions
            submitting={submitting}
            submitLabel="Save"
            submittingLabel="Saving..."
            onCancel={onClose}
          />
        </div>
      </form>
    </Dialog>
  );
}
