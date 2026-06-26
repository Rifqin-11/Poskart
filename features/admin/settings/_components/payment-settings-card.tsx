"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SubscriptionGatewayMode = "duitku" | "midtrans" | "both";

type SettingsForm = {
  qris_provider_merchant_id: string;
  qris_webhook_secret: string;
  subscription_payment_gateway: SubscriptionGatewayMode;
  qris_auto_retry: boolean;
};

type PaymentSettingsCardProps = {
  form: SettingsForm;
  setForm: React.Dispatch<React.SetStateAction<any>>;
};

export function PaymentSettingsCard({
  form,
  setForm,
}: PaymentSettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment settings</CardTitle>
        <CardDescription>
          QRIS provider settings and subscription checkout gateway.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <label className="block text-xs font-medium text-zinc-600">
          Provider merchant ID
          <Input
            className="mt-1"
            placeholder="MID-12345"
            value={form.qris_provider_merchant_id}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                qris_provider_merchant_id: e.target.value,
              }))
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Webhook secret
          <Input
            className="mt-1"
            placeholder="••••••••"
            type="password"
            value={form.qris_webhook_secret}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                qris_webhook_secret: e.target.value,
              }))
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Subscription payment gateway
          <Select
            className="mt-1"
            value={form.subscription_payment_gateway}
            onChange={(e) =>
              setForm((f: any) => ({
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
        </label>
        <label className="flex items-end gap-2 text-sm text-zinc-700">
          <Switch
            checked={form.qris_auto_retry}
            onCheckedChange={(v) =>
              setForm((f: any) => ({ ...f, qris_auto_retry: v }))
            }
          />
          Auto retry failed QRIS payment
        </label>
      </CardContent>
    </Card>
  );
}
