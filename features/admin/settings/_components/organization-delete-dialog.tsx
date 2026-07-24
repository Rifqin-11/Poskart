"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function OrganizationDeleteDialog({
  open,
  organizationName,
  isDeleting,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  organizationName: string;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (confirmation: string) => void;
}) {
  const [confirmation, setConfirmation] = useState("");
  const expectedConfirmation = useMemo(
    () => `delete ${organizationName}`,
    [organizationName],
  );
  const isConfirmed = confirmation === expectedConfirmation;

  const closeDialog = () => {
    setConfirmation("");
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isDeleting) return;
        if (!nextOpen) {
          closeDialog();
          return;
        }
        onOpenChange(true);
      }}
      title="Delete workspace permanently"
      className="max-w-lg"
      overlayClassName="z-[90]"
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold">This action cannot be undone.</p>
              <p className="mt-1 leading-6 text-red-800">
                Semua konfigurasi, perangkat, transaksi, voucher, dan data
                workspace <span className="font-semibold">{organizationName}</span>{" "}
                akan dihapus permanen.
              </p>
            </div>
          </div>
        </div>

        <label className="block text-sm font-medium text-zinc-800">
          Ketik <span className="font-mono text-red-700">{expectedConfirmation}</span>{" "}
          untuk melanjutkan.
          <Input
            className="mt-2 font-mono"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={expectedConfirmation}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            disabled={isDeleting}
          />
        </label>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            onClick={closeDialog}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!isConfirmed || isDeleting}
            onClick={() => onConfirm(confirmation)}
          >
            <Trash2 className="size-4" />
            {isDeleting ? "Deleting..." : "Delete workspace"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
