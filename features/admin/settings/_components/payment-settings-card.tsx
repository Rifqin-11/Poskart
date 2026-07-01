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

type SubscriptionGatewayMode = "duitku" | "midtrans" | "both";

type SettingsForm = {
  qris_provider_merchant_id: string;
  qris_webhook_secret: string;
  subscription_payment_gateway: SubscriptionGatewayMode;
  qris_auto_retry: boolean;
};

type PaymentSettingsCardProps<T extends SettingsForm> = {
  form: T;
  setForm: Dispatch<SetStateAction<T>>;
};

export function PaymentSettingsCard<T extends SettingsForm>({
  form,
  setForm,
}: PaymentSettingsCardProps<T>) {
  return (
    <SettingsCard
      title="Payment settings"
      description="QRIS provider settings and subscription checkout gateway."
      icon={<CreditCard className="size-4" />}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-4 md:grid-cols-2">
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
            >
              <option value="duitku">Duitku</option>
              <option value="midtrans">Midtrans</option>
              <option value="both">Duitku + Midtrans</option>
            </Select>
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
