"use client";

import type { Dispatch, SetStateAction } from "react";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { Image as ImageIcon, Link2, Timer, Warehouse } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  SettingField,
  SettingsCard,
  SettingsFormIntro,
  SettingsPanelBlock,
  SettingsSummaryItem,
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
  mode?: "summary" | "form";
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
  mode = "summary",
}: MediaSettingsCardProps<T>) {
  const { t } = useI18n();
  if (mode === "summary") {
    return (
      <SettingsCard
        title="Media & gallery settings"
        description="Download link lifetime, cleanup retention, storage label, and watermark policy."
        icon={<ImageIcon className="size-4" />}
      >
        <SettingsPanelBlock>
          <div className="grid gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
            <SettingsSummaryItem
              icon={<Link2 className="size-3.5" />}
              label="Share link"
              value={`${expiryHoursToDays(form.download_expiry_hours)} days`}
            />
            <SettingsSummaryItem
              icon={<Timer className="size-3.5" />}
              label="Gallery retention"
              value={`${form.gallery_retention_days} days`}
            />
            <SettingsSummaryItem
              icon={<Warehouse className="size-3.5" />}
              label="Storage"
              value={form.storage_provider}
            />
            <SettingsSummaryItem
              icon={<ImageIcon className="size-3.5" />}
              label="Watermark"
              value={form.watermark_enabled ? "Enabled" : "Disabled"}
            />
          </div>
        </SettingsPanelBlock>
      </SettingsCard>
    );
  }

  return (
    <div className="space-y-5">
      <SettingsFormIntro
        icon={<ImageIcon className="size-4" />}
        title="Media delivery preferences"
        description="Control how long guest links and gallery files remain available after a booth session."
      />
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-950">
            Availability & storage
          </h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            These values apply to new gallery sessions and generated share links.
          </p>
        </div>
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
      </section>
      <SwitchSetting
        title="Add watermark to gallery media"
        description={t("settings.watermarkDesc")}
        checked={form.watermark_enabled}
        onCheckedChange={(checked) =>
          setForm((current) => ({
            ...current,
            watermark_enabled: checked,
          }))
        }
      />
    </div>
  );
}
