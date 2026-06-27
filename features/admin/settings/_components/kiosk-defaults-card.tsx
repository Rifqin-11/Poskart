"use client";

import { Wrench } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card>
      <CardHeader>
        <CardTitle>Global kiosk defaults</CardTitle>
        <CardDescription>
          Organization-wide defaults consumed by dashboard flows and Flutter
          startup config. Device-specific printer, template, and timer values
          are managed from Devices.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-xs font-medium text-zinc-600">
            Merchant name
            <Input
              className="mt-1"
              placeholder="POSKART"
              value={form.merchant_name}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  merchant_name: e.target.value,
                }))
              }
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            QRIS payload prefix
            <Input
              className="mt-1"
              placeholder="qris://poskart/pay"
              value={form.qris_payload_prefix}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  qris_payload_prefix: e.target.value,
                }))
              }
            />
          </label>
        </div>
        <label className="block text-xs font-medium text-zinc-600">
          Share base URL
          <Input
            className="mt-1"
            placeholder="https://poskart.app/s"
            value={form.share_base_url}
            onChange={(e) =>
              setForm((f) => ({ ...f, share_base_url: e.target.value }))
            }
          />
        </label>
        <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <Wrench className="size-4" />
              Global maintenance fallback
            </div>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Per-device maintenance is managed from Devices. This switch is
              kept as the global fallback consumed by legacy config clients.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-600">
              {form.maintenance_mode ? "Enabled" : "Disabled"}
            </span>
            <Switch
              checked={form.maintenance_mode}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, maintenance_mode: v }))
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
