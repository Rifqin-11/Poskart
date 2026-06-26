"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SettingsForm = {
  download_expiry_hours: number;
  gallery_retention_days: number;
  storage_provider: string;
  watermark_enabled: boolean;
};

type MediaSettingsCardProps = {
  form: SettingsForm;
  setForm: React.Dispatch<React.SetStateAction<any>>;
};

function expiryHoursToDays(hours: number) {
  return Math.max(1, Math.round(hours / 24));
}

function expiryDaysToHours(days: number) {
  if (!Number.isFinite(days)) return 168;
  return Math.max(1, Math.min(30, Math.round(days))) * 24;
}

export function MediaSettingsCard({
  form,
  setForm,
}: MediaSettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Media & gallery settings</CardTitle>
        <CardDescription>
          Download link lifetime, cleanup retention, storage label, and
          watermark policy.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-4">
        <label className="block text-xs font-medium text-zinc-600">
          Share link expiry (days)
          <Input
            className="mt-1"
            type="number"
            min={1}
            max={30}
            value={expiryHoursToDays(form.download_expiry_hours)}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                download_expiry_hours: expiryDaysToHours(
                  Number(e.target.value),
                ),
              }))
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Gallery retention (days)
          <Input
            className="mt-1"
            type="number"
            min={1}
            max={365}
            value={form.gallery_retention_days}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                gallery_retention_days: Number(e.target.value),
              }))
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Storage provider
          <Input
            className="mt-1"
            value={form.storage_provider}
            onChange={(e) =>
              setForm((f: any) => ({ ...f, storage_provider: e.target.value }))
            }
          />
        </label>
        <label className="flex items-end gap-2 text-sm text-zinc-700">
          <Switch
            checked={form.watermark_enabled}
            onCheckedChange={(v) =>
              setForm((f: any) => ({ ...f, watermark_enabled: v }))
            }
          />
          Watermark enabled
        </label>
      </CardContent>
    </Card>
  );
}
