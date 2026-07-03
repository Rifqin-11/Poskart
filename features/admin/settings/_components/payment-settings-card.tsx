"use client";

import type { Dispatch, SetStateAction } from "react";
import { CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  SettingField,
  SettingsCard,
  SwitchSetting,
} from "./settings-card";
import { cn } from "@/lib/utils";
import { Building2, Landmark } from "lucide-react";

type SubscriptionGatewayMode = "duitku" | "midtrans" | "both";

type SettingsForm = {
  payment_mode: "sharing" | "private";
  qris_provider_merchant_id: string;
  qris_webhook_secret: string;
  subscription_payment_gateway: SubscriptionGatewayMode;
  qris_auto_retry: boolean;
};

type PaymentSettingsCardProps<T extends SettingsForm> = {
  form: T;
  setForm: Dispatch<SetStateAction<T>>;
  superadminGateway?: SubscriptionGatewayMode;
};

export function PaymentSettingsCard<T extends SettingsForm>({
  form,
  setForm,
  superadminGateway,
}: PaymentSettingsCardProps<T>) {
  
  // Calculate allowed gateway options based on superadmin settings
  const allowedOptions = superadminGateway === "both"
    ? [
        { value: "duitku", label: "Duitku" },
        { value: "midtrans", label: "Midtrans" },
      ]
    : superadminGateway === "duitku"
    ? [{ value: "duitku", label: "Duitku" }]
    : superadminGateway === "midtrans"
    ? [{ value: "midtrans", label: "Midtrans" }]
    : [
        { value: "duitku", label: "Duitku" },
        { value: "midtrans", label: "Midtrans" },
        { value: "both", label: "Duitku + Midtrans" },
      ];
  return (
    <SettingsCard
      title="Payment settings"
      description="QRIS provider settings and subscription checkout gateway."
      icon={<CreditCard className="size-4" />}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-4 md:grid-cols-2">
          
          {/* Payment Mode Selection */}
          <div className="md:col-span-2 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, payment_mode: "sharing" }))}
              className={cn(
                "flex flex-col items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                form.payment_mode === "sharing"
                  ? "border-blue-600 bg-blue-50/50"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              )}
            >
              <div className={cn(
                "grid size-10 place-items-center rounded-full",
                form.payment_mode === "sharing" ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-600"
              )}>
                <Building2 className="size-5" />
              </div>
              <div>
                <div className="font-semibold text-zinc-950">Payment Sharing</div>
                <div className="mt-1 text-xs leading-5 text-zinc-500">
                  Gunakan QRIS bawaan POSKART. Hasil penjualan akan dikumpulkan di akun Anda dan dapat dicairkan (payout) kapan saja.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, payment_mode: "private" }))}
              className={cn(
                "flex flex-col items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                form.payment_mode === "private"
                  ? "border-emerald-600 bg-emerald-50/50"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              )}
            >
              <div className={cn(
                "grid size-10 place-items-center rounded-full",
                form.payment_mode === "private" ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-600"
              )}>
                <Landmark className="size-5" />
              </div>
              <div>
                <div className="font-semibold text-zinc-950">Payment Private</div>
                <div className="mt-1 text-xs leading-5 text-zinc-500">
                  Gunakan akun Duitku Anda sendiri. Pendapatan langsung masuk ke akun Anda tanpa biaya admin POSKART.
                </div>
              </div>
            </button>
          </div>

          {form.payment_mode === "private" && (
            <>
              <SettingField label="Provider merchant ID">
                <Input
                  placeholder="MID-12345"
                  value={form.qris_provider_merchant_id}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      qris_provider_merchant_id: e.target.value,
                    }))
                  }
                />
              </SettingField>
              <SettingField label="Webhook secret">
                <Input
                  placeholder="••••••••"
                  type="password"
                  value={form.qris_webhook_secret}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      qris_webhook_secret: e.target.value,
                    }))
                  }
                />
              </SettingField>
            </>
          )}

          <SettingField
            label="Subscription payment gateway"
            className="md:col-span-2"
          >
            <Select
              value={form.subscription_payment_gateway}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  subscription_payment_gateway:
                    e.target.value as SubscriptionGatewayMode,
                }))
              }
              disabled={allowedOptions.length <= 1} // Auto-disable if only 1 option from superadmin
            >
              {allowedOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            {allowedOptions.length <= 1 && (
              <div className="mt-2 text-xs text-zinc-500">
                Pilihan gateway dibatasi oleh konfigurasi Superadmin.
              </div>
            )}
          </SettingField>
        </div>
        <SwitchSetting
          title="Auto retry failed QRIS payment"
          description="Retry otomatis saat transaksi QRIS gagal diproses."
          checked={form.qris_auto_retry}
          onCheckedChange={(v) =>
            setForm((f) => ({ ...f, qris_auto_retry: v }))
          }
        />
      </div>
    </SettingsCard>
  );
}
