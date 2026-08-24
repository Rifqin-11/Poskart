"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DialogActions } from "@/features/admin/_components/dialog-actions";
import {
  formatJakartaDateTimeLocal,
  parseJakartaDateTimeInput,
} from "@/lib/jakarta-time";
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
  const [form, setForm] = useState<PricingProductInput>(() => ({
    ...initial,
    photoSlotPrices: initialSlotPrices(initial),
  }));

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
        {form.accessMode === "paid" ? (
          <>
            <label className="flex items-start gap-2 rounded-xl border border-zinc-200 p-3 text-sm text-zinc-700 md:col-span-2">
              <Switch
                checked={form.pricingMode === "per_photo_slot"}
                onCheckedChange={(enabled) =>
                  setForm({
                    ...form,
                    pricingMode: enabled ? "per_photo_slot" : "flat",
                    photoSlotPrices:
                      enabled && form.photoSlotPrices.length === 0
                        ? [{ slotCount: 1, price: 0 }]
                        : form.photoSlotPrices,
                  })
                }
              />
              <span>
                <span className="block font-medium">
                  Hitung harga berdasarkan photo slot
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  Tentukan harga final untuk setiap jumlah photo slot yang
                  tersedia pada frame.
                </span>
              </span>
            </label>

            {form.pricingMode === "per_photo_slot" ? (
              <div className="space-y-3 md:col-span-2">
                {form.photoSlotPrices.map((tier, index) => (
                  <div
                    key={tier.slotCount}
                    className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 md:grid-cols-[120px_1fr_1fr_auto] md:items-end"
                  >
                    <div>
                      <div className="text-xs font-semibold text-zinc-800">
                        {tier.slotCount} photo slot
                      </div>
                      <div className="mt-1 text-[11px] text-zinc-500">
                        Harga final
                      </div>
                    </div>
                    <label className="block text-xs font-medium text-zinc-600">
                      Harga
                      <CurrencyInput
                        className="mt-1"
                        min={0}
                        value={tier.price}
                        onValueChange={(price) =>
                          updateSlotTier(index, { price: price ?? 0 })
                        }
                      />
                    </label>
                    <label className="block text-xs font-medium text-zinc-600">
                      Promo (opsional)
                      <CurrencyInput
                        className="mt-1"
                        min={0}
                        value={tier.promoPrice}
                        onValueChange={(promoPrice) =>
                          updateSlotTier(index, {
                            promoPrice: promoPrice ?? undefined,
                          })
                        }
                      />
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={form.photoSlotPrices.length === 1}
                      aria-label={`Hapus harga ${tier.slotCount} photo slot`}
                      onClick={() => removeSlotTier(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-zinc-500">
                    Frame hanya dapat dibayar jika harga untuk jumlah slotnya
                    sudah tersedia.
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={form.photoSlotPrices.length >= 12}
                    onClick={addSlotTier}
                  >
                    <Plus className="size-4" />
                    Tambah harga {nextSlotCount(form)} slot
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <label className="block text-xs font-medium text-zinc-600">
                  Harga sesi
                  <CurrencyInput
                    className="mt-1"
                    min={0}
                    value={form.price}
                    onValueChange={(price) =>
                      setForm({ ...form, price: price ?? 0 })
                    }
                  />
                </label>
                <label className="block text-xs font-medium text-zinc-600">
                  Promo harga sesi (opsional)
                  <CurrencyInput
                    className="mt-1"
                    min={0}
                    value={form.promoPrice}
                    onValueChange={(promoPrice) =>
                      setForm({
                        ...form,
                        promoPrice: promoPrice ?? undefined,
                      })
                    }
                  />
                </label>
              </>
            )}
          </>
        ) : null}
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
                      ? parseJakartaDateTimeInput(e.target.value)?.toISOString()
                      : undefined,
                  })
                }
              />
            </label>
            <label className="flex items-start gap-2 rounded-xl border border-zinc-200 p-3 text-sm text-zinc-700 md:col-span-2">
              <Switch
                checked={form.requiresReprintPassword}
                onCheckedChange={(requiresReprintPassword) =>
                  setForm({ ...form, requiresReprintPassword })
                }
              />
              <span>
                <span className="block font-medium">PIN cetak ulang</span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  Saat aktif, cetak ulang foto event ini meminta PIN Settings
                  kiosk.
                </span>
              </span>
            </label>
          </>
        ) : null}
        <label className="block text-xs font-medium text-zinc-600">
          Print limit
          <Input
            className="mt-1"
            type="number"
            min={1}
            max={20}
            value={form.printLimit}
            onChange={(e) => {
              const printLimit = Number(e.target.value);
              setForm({
                ...form,
                printLimit,
                extraPrintEnabled:
                  printLimit >= 20 ? false : form.extraPrintEnabled,
                extraPrintPrice: printLimit >= 20 ? 0 : form.extraPrintPrice,
              });
            }}
          />
        </label>
        {form.accessMode === "paid" ? (
          <div className="space-y-3 rounded-xl border border-zinc-200 p-3 md:col-span-2">
            <label className="flex items-start gap-2 text-sm text-zinc-700">
              <Switch
                checked={form.extraPrintEnabled}
                disabled={form.printLimit >= 20}
                onCheckedChange={(extraPrintEnabled) =>
                  setForm({
                    ...form,
                    extraPrintEnabled,
                    extraPrintPrice: extraPrintEnabled
                      ? form.extraPrintPrice
                      : 0,
                  })
                }
              />
              <span>
                <span className="block font-medium">Aktifkan extra print</span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  Pelanggan dapat menambah jumlah print setelah memilih paket,
                  hingga total 20 print.
                </span>
              </span>
            </label>
            {form.extraPrintEnabled ? (
              <label className="block text-xs font-medium text-zinc-600">
                Harga per extra print
                <CurrencyInput
                  className="mt-1"
                  min={1}
                  value={form.extraPrintPrice}
                  onValueChange={(extraPrintPrice) =>
                    setForm({ ...form, extraPrintPrice: extraPrintPrice ?? 0 })
                  }
                />
                <span className="mt-1 block text-[11px] font-normal text-zinc-400">
                  Extra print 0 tidak menambah biaya.
                </span>
              </label>
            ) : null}
          </div>
        ) : null}
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

  function updateSlotTier(
    index: number,
    patch: Partial<PricingProductInput["photoSlotPrices"][number]>,
  ) {
    setForm((current) => ({
      ...current,
      photoSlotPrices: current.photoSlotPrices.map((tier, tierIndex) =>
        tierIndex === index ? { ...tier, ...patch } : tier,
      ),
    }));
  }

  function addSlotTier() {
    setForm((current) => {
      const slotCount = nextSlotCount(current);
      if (slotCount > 12) return current;
      return {
        ...current,
        photoSlotPrices: [...current.photoSlotPrices, { slotCount, price: 0 }],
      };
    });
  }

  function removeSlotTier(index: number) {
    setForm((current) => {
      if (current.photoSlotPrices.length === 1) return current;
      return {
        ...current,
        photoSlotPrices: current.photoSlotPrices
          .filter((_, tierIndex) => tierIndex !== index)
          .map((tier, tierIndex) => ({ ...tier, slotCount: tierIndex + 1 })),
      };
    });
  }
}

function toDateTimeLocal(value?: string) {
  return value ? formatJakartaDateTimeLocal(value) : "";
}

function initialSlotPrices(form: PricingProductInput) {
  if (form.photoSlotPrices.length > 0) return form.photoSlotPrices;
  const legacyUnitPrice = Math.max(0, Math.round(form.photoSlotPrice ?? 0));
  const legacyPromoPrice = form.photoSlotPromoPrice;
  if (form.pricingMode === "per_photo_slot" && legacyUnitPrice > 0) {
    return Array.from({ length: 12 }, (_, index) => ({
      slotCount: index + 1,
      price: legacyUnitPrice * (index + 1),
      promoPrice:
        legacyPromoPrice == null ? undefined : legacyPromoPrice * (index + 1),
    }));
  }
  return [{ slotCount: 1, price: 0 }];
}

function nextSlotCount(form: PricingProductInput) {
  return Math.min(13, form.photoSlotPrices.length + 1);
}
