"use client";

import type { Dispatch, SetStateAction } from "react";
import { Building2, CreditCard, Landmark } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  SettingField,
  SettingsCard,
  SwitchSetting,
} from "./settings-card";
import { cn } from "@/lib/utils";

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
};

export function PaymentSettingsCard<T extends SettingsForm>({
  form,
  setForm,
  superadminGateway,
  privateGateway,
  privateGatewayDraft,
  setPrivateGatewayDraft,
}: PaymentSettingsCardProps<T>) {
  const configuredGateway = superadminGateway ?? form.subscription_payment_gateway;
  const gatewayOptions = [
    { value: "duitku", label: "Duitku" },
    { value: "midtrans", label: "Midtrans" },
    { value: "both", label: "Duitku + Midtrans" },
  ] satisfies Array<{ value: SubscriptionGatewayMode; label: string }>;

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
            <div className="md:col-span-2 grid gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <div className="text-sm font-semibold text-emerald-950">
                  Credential Duitku organisasi
                </div>
                <div className="mt-1 text-xs leading-5 text-emerald-800/80">
                  QRIS kiosk akan dibuat memakai merchant code dan API key ini.
                  API key disimpan terenkripsi dan tidak ditampilkan ulang.
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
                      ? `Tersimpan ••••${privateGateway.apiKeyLast4 ?? ""}`
                      : "Masukkan API key Duitku"
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
                    Kosongkan jika tidak ingin mengganti API key.
                  </div>
                ) : null}
              </SettingField>

              <SettingField label="QRIS payment method">
                <Select
                  value={privateGatewayDraft.paymentMethod}
                  onChange={(event) =>
                    setPrivateGatewayDraft((draft) => ({
                      ...draft,
                      paymentMethod: event.target.value,
                    }))
                  }
                >
                  <option value="SQ">Nusapay (SQ)</option>
                  <option value="SP">Shopee Pay (SP)</option>
                </Select>
                <div className="mt-2 text-xs text-emerald-800/75">
                  Pilih metode QRIS yang aktif di akun Duitku organisasi.
                </div>
              </SettingField>
            </div>
          )}

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
              Gateway checkout subscription mengikuti konfigurasi Super Admin.
            </div>
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
