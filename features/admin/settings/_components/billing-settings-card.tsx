"use client";

import { useState } from "react";
import {
  CreditCard,
  ReceiptText,
  ShieldCheck,
  Store,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubscriptionDialog } from "@/features/billing/subscription/subscription-dialog";
import { SubscriptionPaymentsPanel } from "@/features/billing/subscription/subscription-payments-panel";
import { useTenantDetails } from "@/features/admin/organization/use-organization";
import { SettingsCard } from "./settings-card";

function formatDate(value?: string | null) {
  if (!value) return "Belum aktif";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function BillingMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 truncate text-sm font-semibold text-zinc-950">
        {value}
      </div>
    </div>
  );
}

export function BillingSettingsCard({
  subscriptionRequired,
  canManageSubscription,
}: {
  subscriptionRequired: boolean;
  canManageSubscription: boolean;
}) {
  const { data: tenant } = useTenantDetails();
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] =
    useState(subscriptionRequired);

  const subscriptionActive = Boolean(tenant?.subscription_is_active);
  const subscriptionStatus = tenant?.subscription_status ?? "free";
  const planName = tenant?.plan_name ?? "Free organization";
  const deviceLimit = tenant?.device_limit ?? 1;
  const isFreeAccount = !subscriptionActive || subscriptionStatus === "free";

  return (
    <div className="space-y-0">
      <SettingsCard
        icon={<CreditCard className="size-4" />}
        title="Langganan"
        description="Plan aktif, masa berlaku, dan limit device untuk organisasi ini."
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <BillingMetric
              icon={<CreditCard className="size-3.5" />}
              label="Plan"
              value={planName}
            />
            <BillingMetric
              icon={<ShieldCheck className="size-3.5" />}
              label="Status"
              value={
                <span className="capitalize">
                  {subscriptionActive ? "active" : subscriptionStatus}
                </span>
              }
            />
            <BillingMetric
              icon={<Store className="size-3.5" />}
              label="Device limit"
              value={`${deviceLimit} device${deviceLimit > 1 ? "s" : ""}`}
            />
            <BillingMetric
              icon={<Timer className="size-3.5" />}
              label="Berakhir"
              value={formatDate(tenant?.subscription_expires_at)}
            />
          </div>
          {canManageSubscription ? (
            <Button
              type="button"
              className="rounded-xl"
              onClick={() => setSubscriptionDialogOpen(true)}
            >
              {isFreeAccount ? "Lihat paket langganan" : "Kelola langganan"}
            </Button>
          ) : null}
        </div>
      </SettingsCard>

      <SettingsCard
        icon={<ReceiptText className="size-4" />}
        title="Pembayaran & riwayat"
        description="Pembayaran berjalan (berlaku 15 menit) dan riwayat pembayaran langganan."
      >
        <SubscriptionPaymentsPanel />
      </SettingsCard>

      <SubscriptionDialog
        open={subscriptionDialogOpen}
        onOpenChange={setSubscriptionDialogOpen}
      />
    </div>
  );
}
