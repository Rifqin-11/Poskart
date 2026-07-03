"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type ConfirmDialogState = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  options,
  onOpenChange,
}: {
  open: boolean;
  options: ConfirmDialogState | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!options) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={options.title}
      className="max-w-md"
      overlayClassName="z-[90]"
    >
      <div className="space-y-5">
        {options.description ? (
          <p className="text-sm leading-6 text-zinc-500">{options.description}</p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {options.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            variant={options.destructive ? "destructive" : "default"}
            onClick={() => {
              options.onConfirm();
              onOpenChange(false);
            }}
          >
            {options.confirmLabel ?? "Confirm"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmDialogState | null>(null);

  const confirm = useCallback((nextOptions: ConfirmDialogState) => {
    setOptions(nextOptions);
  }, []);

  const dialog = (
    <ConfirmDialog
      open={Boolean(options)}
      options={options}
      onOpenChange={(open) => {
        if (!open) setOptions(null);
      }}
    />
  );

  return { confirm, dialog };
}
