"use client";

import {
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MonitorSmartphone,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { OperationalSubscriptionNotice } from "@/features/admin/subscription/operational-subscription-notice";
import { useI18n } from "@/lib/i18n/i18n-provider";

export type DevicePairingStep = "prepare" | "code" | "paired";

type DevicePairingDialogProps = {
  open: boolean;
  subscriptionActive: boolean;
  step: DevicePairingStep;
  pairingCode: string;
  validating: boolean;
  onOpenChange: (open: boolean) => void;
  onCodeChange: (value: string) => void;
  onContinueToCode: () => void;
  onBackToPrepare: () => void;
  onSubmit: () => void;
  onContinueToConfiguration: () => void;
};

const steps: Array<{
  key: DevicePairingStep;
  labelKey:
    | "devices.pairingStepPrepare"
    | "devices.pairingStepCode"
    | "devices.pairingStepComplete";
}> = [
  { key: "prepare", labelKey: "devices.pairingStepPrepare" },
  { key: "code", labelKey: "devices.pairingStepCode" },
  { key: "paired", labelKey: "devices.pairingStepComplete" },
];

export function DevicePairingDialog({
  open,
  subscriptionActive,
  step,
  pairingCode,
  validating,
  onOpenChange,
  onCodeChange,
  onContinueToCode,
  onBackToPrepare,
  onSubmit,
  onContinueToConfiguration,
}: DevicePairingDialogProps) {
  const { t } = useI18n();
  const currentStepIndex = steps.findIndex((item) => item.key === step);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("devices.pairingTitle")}
      className="max-w-md"
    >
      {!subscriptionActive ? (
        <OperationalSubscriptionNotice />
      ) : (
        <div className="space-y-5">
          <div
            aria-label={t("devices.pairingProgress")}
            className="grid grid-cols-3 gap-2"
          >
            {steps.map((item, index) => {
              const complete = index < currentStepIndex;
              const active = index === currentStepIndex;

              return (
                <div key={item.key} className="min-w-0">
                  <div
                    className={
                      "h-1.5 rounded-full transition-colors " +
                      (complete || active ? "bg-[#00357B]" : "bg-zinc-100")
                    }
                  />
                  <p
                    className={
                      "mt-2 truncate text-[10px] font-semibold uppercase tracking-[0.12em] " +
                      (active ? "text-[#00357B]" : "text-zinc-400")
                    }
                  >
                    {t(item.labelKey)}
                  </p>
                </div>
              );
            })}
          </div>

          {step === "prepare" ? (
            <div className="space-y-5">
              <div className="rounded-3xl border border-blue-100 bg-[#f7f9ff] p-5">
                <div className="grid size-12 place-items-center rounded-2xl bg-white text-[#00357B] shadow-sm ring-1 ring-blue-100">
                  <MonitorSmartphone className="size-6" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-zinc-950">
                  {t("devices.pairingPrepareTitle")}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-zinc-600">
                  {t("devices.pairingPrepareDesc")}
                </p>
              </div>

              <ol className="space-y-3">
                {[1, 2, 3].map((number) => (
                  <li key={number} className="flex gap-3 text-sm">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-zinc-950 text-[11px] font-bold text-white">
                      {number}
                    </span>
                    <span className="leading-6 text-zinc-600">
                      {t(
                        `devices.pairingPrepareStep${number}` as
                          | "devices.pairingPrepareStep1"
                          | "devices.pairingPrepareStep2"
                          | "devices.pairingPrepareStep3",
                      )}
                    </span>
                  </li>
                ))}
              </ol>

              <Link
                href="/download"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#00357B] hover:underline"
              >
                {t("devices.pairingDownloadApp")}
                <ArrowUpRight className="size-3.5" />
              </Link>

              <Button type="button" className="w-full" onClick={onContinueToCode}>
                {t("devices.pairingOpenApp")}
                <ChevronRight className="size-4" />
              </Button>
            </div>
          ) : null}

          {step === "code" ? (
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
              }}
            >
              <div className="rounded-3xl border border-zinc-100 bg-zinc-50 p-5">
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-[#00357B] shadow-sm ring-1 ring-zinc-200">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-950">
                      {t("devices.pairingCodeTitle")}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      {t("devices.pairingCodeDesc")}
                    </p>
                  </div>
                </div>
              </div>

              <label className="block text-xs font-semibold text-zinc-600">
                {t("devices.pairingCodeLabel")}
                <Input
                  autoFocus
                  value={pairingCode}
                  onChange={(event) => onCodeChange(event.target.value)}
                  placeholder="AB12CD34"
                  maxLength={8}
                  inputMode="text"
                  autoComplete="one-time-code"
                  className="mt-2 h-14 text-center font-mono text-xl font-semibold tracking-[0.24em]"
                />
                <span className="mt-2 block text-center text-[11px] font-normal text-zinc-400">
                  {t("devices.pairingCodeHint")}
                </span>
              </label>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBackToPrepare}
                >
                  <ChevronLeft className="size-4" />
                  {t("devices.pairingBack")}
                </Button>
                <Button
                  type="submit"
                  disabled={pairingCode.length < 8 || validating}
                >
                  {validating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  {validating
                    ? t("devices.pairingChecking")
                    : t("devices.pairingContinue")}
                </Button>
              </div>
            </form>
          ) : null}

          {step === "paired" ? (
            <div className="space-y-5 text-center">
              <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <CheckCircle2 className="size-8" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-950">
                  {t("devices.pairingSuccessTitle")}
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                  {t("devices.pairingSuccessDesc")}
                </p>
              </div>
              <div className="space-y-2">
                <Button
                  type="button"
                  className="w-full"
                  onClick={onContinueToConfiguration}
                >
                  {t("devices.pairingConfigure")}
                  <ChevronRight className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => onOpenChange(false)}
                >
                  {t("devices.pairingLater")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Dialog>
  );
}
