"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Transaction, TransactionProvider } from "@/types/transaction";

type TransactionEditForm = {
  booth: string;
  location: string;
  customer: string;
  package_name: string;
  amount: string;
  status: "paid" | "pending" | "failed" | "refunded";
  provider: TransactionProvider;
};

type TransactionDetailsDialogProps = {
  transaction: Transaction | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (patch: {
    booth: string;
    location: string;
    customer: string;
    package_name: string;
    amount: number;
    status: "paid" | "pending" | "failed" | "refunded";
    provider: TransactionProvider;
  }) => void;
};

export function TransactionDetailsDialog({
  transaction,
  submitting,
  onClose,
  onSubmit,
}: TransactionDetailsDialogProps) {
  const [form, setForm] = useState<TransactionEditForm>({
    booth: "",
    location: "",
    customer: "",
    package_name: "",
    amount: "0",
    status: "paid",
    provider: "QRIS",
  });

  useEffect(() => {
    if (transaction) {
      setForm({
        booth: transaction.device,
        location: transaction.location,
        customer: transaction.customer,
        package_name: transaction.packageName,
        amount: String(transaction.amount),
        status: transaction.status,
        provider: transaction.provider,
      });
    }
  }, [transaction]);

  if (!transaction) return null;

  return (
    <Dialog
      open={Boolean(transaction)}
      title="Edit Transaction"
      onOpenChange={(open) => !open && onClose()}
    >
      <div className="space-y-4">
        <p className="text-xs text-zinc-500 font-mono">{transaction.id}</p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-xs font-medium text-zinc-600">
            Device / Booth
            <Input
              className="mt-1"
              value={form.booth}
              onChange={(e) =>
                setForm((f) => ({ ...f, booth: e.target.value }))
              }
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Location
            <Input
              className="mt-1"
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Customer
            <Input
              className="mt-1"
              value={form.customer}
              onChange={(e) =>
                setForm((f) => ({ ...f, customer: e.target.value }))
              }
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Package name
            <Input
              className="mt-1"
              value={form.package_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, package_name: e.target.value }))
              }
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Amount (Rp)
            <Input
              className="mt-1"
              type="number"
              min={0}
              value={form.amount}
              onChange={(e) =>
                setForm((f) => ({ ...f, amount: e.target.value }))
              }
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Provider
            <select
              className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
              value={form.provider}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  provider: e.target.value as TransactionProvider,
                }))
              }
            >
              <option value="QRIS">QRIS</option>
              <option value="Cash">Cash</option>
              <option value="Voucher">Voucher</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-zinc-600 md:col-span-2">
            Status
            <select
              className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  status: e.target.value as
                    | "paid"
                    | "pending"
                    | "failed"
                    | "refunded",
                }))
              }
            >
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSubmit({
                booth: form.booth,
                location: form.location,
                customer: form.customer,
                package_name: form.package_name,
                amount: Number(form.amount),
                status: form.status,
                provider: form.provider,
              })
            }
            disabled={submitting}
          >
            {submitting ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
