"use client";

import type { Dispatch, SetStateAction } from "react";
import { Building2, CreditCard, Landmark, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SettingField, SettingsCard, SwitchSetting } from "./settings-card";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/i18n-provider";

type SubscriptionGatewayMode = "duitku" | "midtrans" | "both";

type SettingsForm = {
  payment_mode: "sharing" | "private";
  qris_payment_method: "SQ" | "SP";
  qris_provider_merchant_id: string;
  qris_webhook_secret: string;
  subscription_payment_gateway: SubscriptionGatewayMode;
  qris_auto_retry: boolean;
};

type PaymentSettingsCardProps<T extends SettingsForm> = {
  form: T;
  setForm: Dispatch<SetStateAction<T>>;
  superadminGateway?: SubscriptionGatewayMode;
  privateGateway?: {
    merchantCode: string;
    sandbox: boolean;
    paymentMethod: string;
    hasApiKey: boolean;
    apiKeyLast4: string | null;
  } | null;
  privateGatewayDraft: {
    merchantCode: string;
    apiKey: string;
    sandbox: boolean;
    paymentMethod: string;
  };
  setPrivateGatewayDraft: Dispatch<
    SetStateAction<{
      merchantCode: string;
      apiKey: string;
      sandbox: boolean;
      paymentMethod: string;
    }>
  >;
  saving?: boolean;
  onSave?: () => void;
};

export function PaymentSettingsCard<T extends SettingsForm>({
  form,
  setForm,
  superadminGateway,
  privateGateway,
  privateGatewayDraft,
  setPrivateGatewayDraft,
  saving = false,
  onSave,
}: PaymentSettingsCardProps<T>) {
  const { t } = useI18n();
  const configuredGateway =
    superadminGateway ?? form.subscription_payment_gateway;
  const gatewayOptions = [
    { value: "duitku", label: "Duitku" },
    { value: "midtrans", label: "Midtrans" },
    { value: "both", label: "Duitku + Midtrans" },
  ] satisfies Array<{ value: SubscriptionGatewayMode; label: string }>;

  return (
    <SettingsCard
      title={t("payment.settingsTitle")}
      description={t("payment.settingsDesc")}
      icon={<CreditCard className="size-4" />}
    >
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Payment Mode Selection */}
          <div className="md:col-span-2 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                setForm((f) => ({ ...f, payment_mode: "sharing" }))
              }
              className={cn(
                "flex flex-col items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                form.payment_mode === "sharing"
                  ? "border-blue-600 bg-blue-50/50"
                  : "border-zinc-200 bg-white hover:border-zinc-300",
              )}
            >
              <div
                className={cn(
                  "grid size-10 place-items-center rounded-full",
                  form.payment_mode === "sharing"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 text-zinc-600",
                )}
              >
                <Building2 className="size-5" />
              </div>
              <div>
                <div className="font-semibold text-zinc-950">
                  Payment Sharing
                </div>
                <div className="mt-1 text-xs leading-5 text-zinc-500">
                  Use POSKART's built-in QRIS. Sales revenue is collected in your account and can be withdrawn (payout) at any time.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setForm((f) => ({ ...f, payment_mode: "private" }))
              }
              className={cn(
                "flex flex-col items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                form.payment_mode === "private"
                  ? "border-emerald-600 bg-emerald-50/50"
                  : "border-zinc-200 bg-white hover:border-zinc-300",
              )}
            >
              <div
                className={cn(
                  "grid size-10 place-items-center rounded-full",
                  form.payment_mode === "private"
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-100 text-zinc-600",
                )}
              >
                <Landmark className="size-5" />
              </div>
              <div>
                <div className="font-semibold text-zinc-950">
                  Payment Private
                </div>
                <div className="mt-1 text-xs leading-5 text-zinc-500">
                  Use your own Duitku account. Revenue goes directly to your account with no POSKART admin fee.
                </div>
              </div>
            </button>
          </div>

          {form.payment_mode === "private" && (
            <div className="md:col-span-2 grid gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <div className="text-sm font-semibold text-emerald-950">
                  Organization Duitku credentials
                </div>
                <div className="mt-1 text-xs leading-5 text-emerald-800/80">
                  Kiosk QRIS will be generated using this merchant code and API key. The API key is stored encrypted and will not be shown again.
                </div>
              </div>

              <SettingField label="Merchant code">
                <Input
                  placeholder="DXXXX"
                  value={privateGatewayDraft.merchantCode}
                  onChange={(event) =>
                    setPrivateGatewayDraft((draft) => ({
                      ...draft,
                      merchantCode: event.target.value,
                    }))
                  }
                />
              </SettingField>

              <SettingField label="API key">
                <Input
                  type="password"
                  placeholder={
                    privateGateway?.hasApiKey
                      ? `Saved ••••${privateGateway.apiKeyLast4 ?? ""}`
                      : "Enter Duitku API key"
                  }
                  value={privateGatewayDraft.apiKey}
                  onChange={(event) =>
                    setPrivateGatewayDraft((draft) => ({
                      ...draft,
                      apiKey: event.target.value,
                    }))
                  }
                />
                {privateGateway?.hasApiKey ? (
                  <div className="mt-2 text-xs text-emerald-800/75">
                    Leave blank to keep the current API key.
                  </div>
                ) : null}
              </SettingField>

            </div>
          )}

          <SettingField
            label="QRIS Merchant"
            className="md:col-span-2"
          >
            <Select
              value={form.qris_payment_method}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  qris_payment_method:
                    event.target.value === "SP" ? "SP" : "SQ",
                }))
              }
            >
              <option value="SQ">NusaPay QRIS</option>
              <option value="SP">ShopeePay QRIS</option>
            </Select>
            <div className="mt-2 text-xs leading-5 text-zinc-500">
              Applies to new QRIS from Flutter booths. If one channel is experiencing issues, select another channel and save; devices will use the new selection on the next payment. QR codes already generated will continue using the previous channel.
            </div>
          </SettingField>

          <SettingField
            label="Subscription payment gateway"
            className="md:col-span-2"
          >
            <Select
              value={configuredGateway}
              onChange={() => undefined}
              disabled
            >
              {gatewayOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <div className="mt-2 text-xs text-zinc-500">
              Gateway checkout subscription follows Super Admin configuration.
            </div>
          </SettingField>
        </div>
        <div className="border-t border-zinc-100 pt-5">
          <SwitchSetting
            title="Auto retry failed QRIS payment"
            description="Automatically retry when a QRIS transaction fails to process."
            checked={form.qris_auto_retry}
            onCheckedChange={(v) =>
              setForm((f) => ({ ...f, qris_auto_retry: v }))
            }
          />
          <Button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="mt-3 w-full rounded-2xl"
          >
            <Save className="size-4" />
            {saving ? t("payment.saving") : t("payment.save")}
          </Button>
        </div>
      </div>
    </SettingsCard>
  );
}
