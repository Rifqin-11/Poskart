"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  Building2,
  Check,
  CreditCard,
  Landmark,
  RefreshCw,
  ScanLine,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/i18n-provider";
import {
  SettingField,
  SettingsCard,
  SettingsFormIntro,
  SettingsPanelBlock,
  SettingsSummaryItem,
  SwitchSetting,
} from "./settings-card";

type SubscriptionGatewayMode = "duitku" | "midtrans" | "both";

type SettingsForm = {
  payment_mode: "sharing" | "private";
  qris_payment_method: "SQ" | "SP";
  qris_provider_merchant_id: string;
  qris_webhook_secret: string;
  subscription_payment_gateway: SubscriptionGatewayMode;
  qris_auto_retry: boolean;
};

type PrivateGatewayDraft = {
  merchantCode: string;
  apiKey: string;
  sandbox: boolean;
  paymentMethod: string;
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
  privateGatewayDraft: PrivateGatewayDraft;
  setPrivateGatewayDraft: Dispatch<SetStateAction<PrivateGatewayDraft>>;
  mode?: "summary" | "form";
};

const GATEWAY_LABELS: Record<SubscriptionGatewayMode, string> = {
  duitku: "Duitku",
  midtrans: "Midtrans",
  both: "Duitku + Midtrans",
};

export function PaymentSettingsCard<T extends SettingsForm>({
  form,
  setForm,
  superadminGateway,
  privateGateway,
  privateGatewayDraft,
  setPrivateGatewayDraft,
  mode = "summary",
}: PaymentSettingsCardProps<T>) {
  const { t } = useI18n();
  const configuredGateway =
    superadminGateway ?? form.subscription_payment_gateway;

  if (mode === "summary") {
    return (
      <SettingsCard
        title={t("payment.settingsTitle")}
        description={t("payment.settingsDesc")}
        icon={<CreditCard className="size-4" />}
      >
        <SettingsPanelBlock>
          <div className="grid gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
            <SettingsSummaryItem
              icon={<Landmark className="size-3.5" />}
              label="Collection mode"
              value={
                form.payment_mode === "private"
                  ? "Private payment"
                  : "POSKART sharing"
              }
              helper={
                form.payment_mode === "private"
                  ? "Funds go to your Duitku account"
                  : "Managed through POSKART"
              }
            />
            <SettingsSummaryItem
              icon={<ScanLine className="size-3.5" />}
              label="QRIS channel"
              value={
                form.qris_payment_method === "SP"
                  ? "ShopeePay QRIS"
                  : "NusaPay QRIS"
              }
            />
            <SettingsSummaryItem
              icon={<CreditCard className="size-3.5" />}
              label="Subscription gateway"
              value={GATEWAY_LABELS[configuredGateway]}
              helper="Set by POSKART"
            />
            <SettingsSummaryItem
              icon={<RefreshCw className="size-3.5" />}
              label="Failed payment retry"
              value={form.qris_auto_retry ? "Enabled" : "Disabled"}
            />
          </div>
        </SettingsPanelBlock>
      </SettingsCard>
    );
  }

  return (
    <div className="space-y-5">
      <SettingsFormIntro
        icon={<CreditCard className="size-4" />}
        title="Payment preferences"
        description="Choose where booth payments are collected and which QRIS channel new transactions use."
      />

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-950">
            Payment collection
          </h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Select one collection method for all connected booths.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              value: "sharing" as const,
              title: "POSKART sharing",
              description:
                "Use POSKART QRIS and withdraw collected revenue through payout.",
              icon: Building2,
            },
            {
              value: "private" as const,
              title: "Private payment",
              description:
                "Use your own Duitku account so revenue goes directly to you.",
              icon: Landmark,
            },
          ].map((option) => {
            const selected = form.payment_mode === option.value;
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    payment_mode: option.value,
                  }))
                }
                className={cn(
                  "group relative flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00357B]/30",
                  selected
                    ? "border-[#00357B] bg-[#00357B]/[0.035]"
                    : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/70",
                )}
              >
                <div
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-xl",
                    selected
                      ? "bg-[#00357B] text-white"
                      : "bg-zinc-100 text-zinc-500",
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 pr-5">
                  <div className="text-sm font-semibold text-zinc-950">
                    {option.title}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    {option.description}
                  </p>
                </div>
                {selected ? (
                  <div className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-[#00357B] text-white">
                    <Check className="size-3" />
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      {form.payment_mode === "private" ? (
        <section className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-950">
              Duitku credentials
            </h3>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              The API key is encrypted and will not be shown again after saving.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
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
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Leave this blank to keep the saved API key.
                </p>
              ) : null}
            </SettingField>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 border-t border-zinc-100 pt-5 md:grid-cols-2">
        <SettingField label="QRIS channel">
          <Select
            value={form.qris_payment_method}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                qris_payment_method: event.target.value === "SP" ? "SP" : "SQ",
              }))
            }
          >
            <option value="SQ">NusaPay QRIS</option>
            <option value="SP">ShopeePay QRIS</option>
          </Select>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Connected devices use the new channel on their next payment.
          </p>
        </SettingField>
        <SettingField label="Subscription payment gateway">
          <Select value={configuredGateway} onChange={() => undefined} disabled>
            {Object.entries(GATEWAY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Subscription checkout follows the POSKART configuration.
          </p>
        </SettingField>
      </section>

      <SwitchSetting
        title="Retry failed QRIS payments"
        description="Automatically retry when a QRIS transaction cannot be processed."
        checked={form.qris_auto_retry}
        onCheckedChange={(checked) =>
          setForm((current) => ({
            ...current,
            qris_auto_retry: checked,
          }))
        }
      />
    </div>
  );
}
