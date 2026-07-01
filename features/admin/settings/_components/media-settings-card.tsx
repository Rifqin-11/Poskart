"use client";

import type { Dispatch, SetStateAction } from "react";
import { Image as ImageIcon, Link2, Timer, Warehouse } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  SettingField,
  SettingsCard,
  SwitchSetting,
} from "./settings-card";

type SettingsForm = {
  download_expiry_hours: number;
  gallery_retention_days: number;
  storage_provider: string;
  watermark_enabled: boolean;
};

type MediaSettingsCardProps<T extends SettingsForm> = {
  form: T;
  setForm: Dispatch<SetStateAction<T>>;
};

function expiryHoursToDays(hours: number) {
  return Math.max(1, Math.round(hours / 24));
}

function expiryDaysToHours(days: number) {
  if (!Number.isFinite(days)) return 168;
  return Math.max(1, Math.min(30, Math.round(days))) * 24;
}

export function MediaSettingsCard<T extends SettingsForm>({
  form,
  setForm,
}: MediaSettingsCardProps<T>) {
  return (
    <SettingsCard
      title="Media & gallery settings"
      description="Download link lifetime, cleanup retention, storage label, and watermark policy."
      icon={<ImageIcon className="size-4" />}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-4 md:grid-cols-3">
          <SettingField label="Share link expiry (days)">
            <Input
              type="number"
              min={1}
              max={30}
              value={expiryHoursToDays(form.download_expiry_hours)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  download_expiry_hours: expiryDaysToHours(
                    Number(e.target.value),
                  ),
                }))
              }
            />
          </SettingField>
          <SettingField label="Gallery retention (days)">
            <Input
              type="number"
              min={1}
              max={365}
              value={form.gallery_retention_days}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  gallery_retention_days: Number(e.target.value),
                }))
              }
            />
          </SettingField>
          <SettingField label="Storage provider">
            <Input
              value={form.storage_provider}
              onChange={(e) =>
                setForm((f) => ({ ...f, storage_provider: e.target.value }))
              }
            />
          </SettingField>
        </div>
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-3xl border border-zinc-200 bg-white p-4">
              <Link2 className="mb-2 size-3.5 text-zinc-500" />
              <div className="text-xs text-zinc-500">Link active</div>
              <div className="mt-1 text-sm font-semibold text-zinc-950">
                {expiryHoursToDays(form.download_expiry_hours)} days
              </div>
            </div>
            <div className="rounded-3xl border border-zinc-200 bg-white p-4">
              <Timer className="mb-2 size-3.5 text-zinc-500" />
              <div className="text-xs text-zinc-500">Retention</div>
              <div className="mt-1 text-sm font-semibold text-zinc-950">
                {form.gallery_retention_days} days
              </div>
            </div>
            <div className="rounded-3xl border border-zinc-200 bg-white p-4">
              <Warehouse className="mb-2 size-3.5 text-zinc-500" />
              <div className="text-xs text-zinc-500">Storage</div>
              <div className="mt-1 truncate text-sm font-semibold text-zinc-950">
                {form.storage_provider}
              </div>
            </div>
          </div>
          <SwitchSetting
            title="Watermark enabled"
            description="Terapkan watermark pada output media."
            checked={form.watermark_enabled}
            onCheckedChange={(v) =>
              setForm((f) => ({ ...f, watermark_enabled: v }))
            }
          />
        </div>
      </div>
    </SettingsCard>
  );
}
