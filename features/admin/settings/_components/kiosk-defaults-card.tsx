"use client";

import { Link2, QrCode, Store, Wrench } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { Input } from "@/components/ui/input";
import {
  SettingField,
  SettingsCard,
  SwitchSetting,
} from "./settings-card";

type SettingsForm = {
  merchant_name: string;
  qris_payload_prefix: string;
  share_base_url: string;
  maintenance_mode: boolean;
};

type KioskDefaultsCardProps<T extends SettingsForm> = {
  form: T;
  setForm: Dispatch<SetStateAction<T>>;
};

export function KioskDefaultsCard<T extends SettingsForm>({
  form,
  setForm,
}: KioskDefaultsCardProps<T>) {
  return (
    <SettingsCard
      title="Global kiosk defaults"
      description="Organization-wide defaults consumed by dashboard flows and Flutter startup config."
      icon={<Wrench className="size-4" />}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <SettingField label="Merchant name">
              <Input
                placeholder="POSKART"
                value={form.merchant_name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    merchant_name: e.target.value,
                  }))
                }
              />
            </SettingField>
            <SettingField label="QRIS payload prefix">
              <Input
                placeholder="qris://poskart/pay"
                value={form.qris_payload_prefix}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    qris_payload_prefix: e.target.value,
                  }))
                }
              />
            </SettingField>
          </div>
          <SettingField label="Share base URL">
            <Input
              placeholder="https://poskart.app/s"
              value={form.share_base_url}
              onChange={(e) =>
                setForm((f) => ({ ...f, share_base_url: e.target.value }))
              }
            />
          </SettingField>
        </div>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-3xl border border-zinc-200 bg-white p-4">
              <Store className="mb-2 size-3.5 text-zinc-500" />
              <div className="text-xs text-zinc-500">Merchant</div>
              <div className="mt-1 truncate text-sm font-semibold text-zinc-950">
                {form.merchant_name || "POSKART"}
              </div>
            </div>
            <div className="rounded-3xl border border-zinc-200 bg-white p-4">
              <QrCode className="mb-2 size-3.5 text-zinc-500" />
              <div className="text-xs text-zinc-500">QRIS prefix</div>
              <div className="mt-1 truncate text-sm font-semibold text-zinc-950">
                {form.qris_payload_prefix || "-"}
              </div>
            </div>
            <div className="rounded-3xl border border-zinc-200 bg-white p-4">
              <Link2 className="mb-2 size-3.5 text-zinc-500" />
              <div className="text-xs text-zinc-500">Share base</div>
              <div className="mt-1 truncate text-sm font-semibold text-zinc-950">
                {form.share_base_url || "-"}
              </div>
            </div>
          </div>
          <SwitchSetting
            title="Global maintenance fallback"
            description="Per-device maintenance is managed from Devices."
            checked={form.maintenance_mode}
            onCheckedChange={(v) =>
              setForm((f) => ({ ...f, maintenance_mode: v }))
            }
          />
        </div>
      </div>
    </SettingsCard>
  );
}
