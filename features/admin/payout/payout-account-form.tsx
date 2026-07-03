"use client";

import { useState, useTransition } from "react";
import { Landmark, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveMyPayoutAccount } from "@/server/admin/actions/payout-actions";
import type { PayoutAccount } from "@/types/payout";

export function PayoutAccountForm({
  account,
  compact = false,
  onSaved,
}: {
  account: PayoutAccount | null;
  compact?: boolean;
  onSaved?: () => void;
}) {
  return (
    <PayoutAccountFields
      key={account?.updatedAt ?? "new-payout-account"}
      account={account}
      compact={compact}
      onSaved={onSaved}
    />
  );
}

function PayoutAccountFields({
  account,
  compact,
  onSaved,
}: {
  account: PayoutAccount | null;
  compact: boolean;
  onSaved?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    bankName: account?.bankName ?? "",
    accountNumber: account?.accountNumber ?? "",
    accountHolderName: account?.accountHolderName ?? "",
  });

  const submit = () => {
    startTransition(async () => {
      const result = await saveMyPayoutAccount(form);
      if (!result.success) {
        toast.error(result.error ?? "Gagal menyimpan rekening payout");
        return;
      }
      toast.success("Rekening payout tersimpan");
      onSaved?.();
    });
  };

  return (
    <div
      className={
        compact
          ? "space-y-3"
          : "rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
      }
    >
      {!compact ? (
        <div className="mb-4 flex items-start gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-zinc-100 text-zinc-700">
            <Landmark className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-950">
              Rekening pencairan
            </h2>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Rekening ini akan disnapshot ke invoice saat request pencairan
              dibuat.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <label className="block text-xs font-medium text-zinc-600">
          Bank
          <Input
            className="mt-1.5"
            value={form.bankName}
            placeholder="BCA / Mandiri / BRI"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                bankName: event.target.value,
              }))
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Nomor rekening
          <Input
            className="mt-1.5"
            value={form.accountNumber}
            placeholder="1234567890"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                accountNumber: event.target.value,
              }))
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Nama pemilik
          <Input
            className="mt-1.5"
            value={form.accountHolderName}
            placeholder="PT / nama pemilik rekening"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                accountHolderName: event.target.value,
              }))
            }
          />
        </label>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          className="rounded-2xl"
          onClick={submit}
          disabled={isPending}
        >
          <Save className="size-4" />
          {isPending ? "Menyimpan..." : "Simpan rekening"}
        </Button>
      </div>
    </div>
  );
}
