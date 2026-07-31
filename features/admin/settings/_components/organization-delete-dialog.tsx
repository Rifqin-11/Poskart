"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/i18n-provider";

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
  const { t } = useI18n();
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
      title={t("org.deleteTitle")}
      className="max-w-lg rounded-3xl"
      overlayClassName="z-[90]"
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-900">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold">{t("org.deleteWarning")}</p>
              <p className="mt-1 leading-6 text-red-800">
                {t("org.deleteDesc").replace("{name}", organizationName)}
              </p>
            </div>
          </div>
        </div>

        <label className="block text-[11px] font-medium uppercase tracking-wide text-zinc-400">
          Confirmation phrase
          <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-zinc-500">
            {t("org.deleteTypeToContinue").replace("{code}", expectedConfirmation)}
          </span>
          <Input
            className="mt-2 font-mono normal-case tracking-normal"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={expectedConfirmation}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            disabled={isDeleting}
          />
        </label>

        <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={isDeleting}
            onClick={closeDialog}
          >
            {t("org.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-xl"
            disabled={!isConfirmed || isDeleting}
            onClick={() => onConfirm(confirmation)}
          >
            <Trash2 className="size-4" />
            {isDeleting ? t("org.deleting") : t("org.deleteWorkspace")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
