"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DialogActions } from "@/features/admin/_components/dialog-actions";
import type { PricingProductInput } from "@/types/pricing";

type PricingFormDialogProps = {
  title: string;
  initial: PricingProductInput;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: PricingProductInput) => void;
};

export function PricingFormDialog({
  title,
  initial,
  submitting,
  onClose,
  onSubmit,
}: PricingFormDialogProps) {
  const [form, setForm] = useState<PricingProductInput>(initial);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={title}>
      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name.trim()) {
            toast.error("Name is required");
            return;
          }
          onSubmit(form);
        }}
      >
        <label className="md:col-span-2 block text-xs font-medium text-zinc-600">
          Name
          <Input
            className="mt-1"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Bronze package"
          />
        </label>
        <label className="md:col-span-2 block text-xs font-medium text-zinc-600">
          Session access
          <Select
            className="mt-1"
            value={form.accessMode}
            onChange={(e) =>
              setForm({
                ...form,
                accessMode: e.target.value as PricingProductInput["accessMode"],
              })
            }
          >
            <option value="paid">Paid package</option>
            <option value="event">Event access (no payment)</option>
          </Select>
          <span className="mt-1 block text-[11px] font-normal text-zinc-400">
            Event access skips package and payment selection on assigned kiosks.
          </span>
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Price (IDR)
          <Input
            className="mt-1"
            type="number"
            min={0}
            value={form.accessMode === "event" ? 0 : form.price}
            disabled={form.accessMode === "event"}
            onChange={(e) =>
              setForm({ ...form, price: Number(e.target.value) })
            }
          />
        </label>
        {form.accessMode === "event" ? (
          <>
            <label className="block text-xs font-medium text-zinc-600">
              Event name
              <Input
                className="mt-1"
                value={form.eventName ?? ""}
                onChange={(e) =>
                  setForm({ ...form, eventName: e.target.value })
                }
                placeholder="Car Free Day"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Event expiry (optional)
              <Input
                className="mt-1"
                type="datetime-local"
                value={toDateTimeLocal(form.eventExpiresAt)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    eventExpiresAt: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : undefined,
                  })
                }
              />
            </label>
          </>
        ) : null}
        <label className="block text-xs font-medium text-zinc-600">
          Promo price (IDR, optional)
          <Input
            className="mt-1"
            type="number"
            min={0}
            value={form.promoPrice ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                promoPrice:
                  e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Print limit
          <Input
            className="mt-1"
            type="number"
            min={1}
            max={20}
            value={form.printLimit}
            onChange={(e) =>
              setForm({ ...form, printLimit: Number(e.target.value) })
            }
          />
        </label>
        <div className="flex flex-wrap items-center gap-6 md:col-span-2">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <Switch
              checked={form.qrisDownload}
              disabled={form.accessMode === "event"}
              onCheckedChange={(v) => setForm({ ...form, qrisDownload: v })}
            />
            QR download
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <Switch
              checked={form.livePhotoEnabled}
              onCheckedChange={(v) => setForm({ ...form, livePhotoEnabled: v })}
            />
            Live Photo enabled
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <Switch
              checked={form.gifEnabled}
              onCheckedChange={(v) => setForm({ ...form, gifEnabled: v })}
            />
            GIF enabled (minimal 2 photo slot)
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <Switch
              checked={form.active}
              onCheckedChange={(v) => setForm({ ...form, active: v })}
            />
            Active
          </label>
        </div>
        <div className="md:col-span-2">
          <DialogActions
            submitting={submitting}
            submitLabel="Save"
            submittingLabel="Saving..."
            onCancel={onClose}
          />
        </div>
      </form>
    </Dialog>
  );
}

function toDateTimeLocal(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
