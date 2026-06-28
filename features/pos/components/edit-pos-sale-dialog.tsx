"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { PosPackageOption, PosPaymentMethod, PosSale } from "@/types/pos";

export function EditPosSaleDialog({
  sale,
  packages,
  pending,
  onClose,
  onSubmit,
}: {
  sale: PosSale;
  packages: PosPackageOption[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: {
    saleId: string;
    packageCode: string;
    printCount: number;
    amount: number;
    paymentMethod: PosPaymentMethod;
    notes: string;
  }) => void;
}) {
  const [packageCode, setPackageCode] = useState(sale.packageCode);
  const [printCount, setPrintCount] = useState(sale.printCount);
  const [amount, setAmount] = useState(sale.amount);
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>(
    sale.paymentMethod,
  );
  const [notes, setNotes] = useState(sale.notes ?? "");

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Edit transaksi POS"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({
            saleId: sale.id,
            packageCode,
            printCount,
            amount,
            paymentMethod,
            notes,
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium">
            Paket
            <Select
              value={packageCode}
              onChange={(event) => setPackageCode(event.target.value)}
            >
              {packages.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Metode pembayaran
            <Select
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(event.target.value as PosPaymentMethod)
              }
            >
              <option value="Cash">Cash</option>
              <option value="QRIS">QRIS</option>
            </Select>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Jumlah print
            <Input
              type="number"
              min={1}
              max={100}
              value={printCount}
              onChange={(event) => setPrintCount(Number(event.target.value))}
              required
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Nominal
            <Input
              type="number"
              min={0}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              required
            />
          </label>
        </div>
        <label className="block space-y-1.5 text-sm font-medium">
          Catatan
          <Input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={500}
            placeholder="Catatan transaksi"
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={pending || !packageCode}>
            {pending ? "Menyimpan..." : "Simpan perubahan"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
