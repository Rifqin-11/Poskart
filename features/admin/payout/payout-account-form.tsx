"use client";

import { useState, useTransition } from "react";
import { Landmark, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveMyPayoutAccount } from "@/server/admin/actions/payout-actions";
import { usePermission } from "@/features/admin/hooks/use-permission";
import type { PayoutAccount } from "@/types/payout";

export function PayoutAccountForm({
  account,
  compact = false,
  onSaved,
  isEditing = false,
}: {
  account: PayoutAccount | null;
  compact?: boolean;
  onSaved?: () => void;
  isEditing?: boolean;
}) {
  return (
    <PayoutAccountFields
      key={account?.updatedAt ?? "new-payout-account"}
      account={account}
      compact={compact}
      onSaved={onSaved}
      isEditing={isEditing}
    />
  );
}

function PayoutAccountFields({
  account,
  compact,
  onSaved,
  isEditing = false,
}: {
  account: PayoutAccount | null;
  compact: boolean;
  onSaved?: () => void;
  isEditing?: boolean;
}) {
  const { isReadOnly } = usePermission();
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

  if (!isEditing) {
    return (
      <div
        className={
          compact
            ? "space-y-4"
            : "rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4"
        }
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {!compact ? (
            <div className="flex items-start gap-3">
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
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4">
            <div className="text-xs font-medium text-zinc-500">Bank</div>
            <div className="mt-1.5 text-sm font-semibold text-zinc-950">
              {account?.bankName || "-"}
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4">
            <div className="text-xs font-medium text-zinc-500">Nomor rekening</div>
            <div className="mt-1.5 text-sm font-semibold text-zinc-950">
              {account?.accountNumber || "-"}
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4">
            <div className="text-xs font-medium text-zinc-500">Nama pemilik</div>
            <div className="mt-1.5 text-sm font-semibold text-zinc-950">
              {account?.accountHolderName || "-"}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          disabled={isPending || isReadOnly("invoices")}
        >
          <Save className="size-4" />
          {isPending ? "Menyimpan..." : "Simpan rekening"}
        </Button>
      </div>
    </div>
  );
}
