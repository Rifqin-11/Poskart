"use client";

import Link from "next/link";
import {
  Check,
  CreditCard,
  MonitorSmartphone,
  Palette,
  Settings2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  hasMinimumDeviceConfiguration,
  isDeviceReady,
} from "@/features/admin/devices/device-readiness";
import { useI18n } from "@/lib/i18n/i18n-provider";
import type { Device } from "@/types/device";

type DashboardSetupGuideProps = {
  subscriptionActive: boolean;
  devices: Device[];
};

export function DashboardSetupGuide({
  subscriptionActive,
  devices,
}: DashboardSetupGuideProps) {
  const { t } = useI18n();
  const hasDevice = devices.length > 0;
  const hasConfiguredDevice = devices.some(hasMinimumDeviceConfiguration);
  const hasReadyDevice = devices.some(isDeviceReady);
  const steps = [
    {
      label: t("dashboard.setupSubscription"),
      description: t("dashboard.setupSubscriptionDesc"),
      done: subscriptionActive,
      href: "/settings?tab=organization&subscription=required",
      icon: CreditCard,
    },
    {
      label: t("dashboard.setupDevice"),
      description: t("dashboard.setupDeviceDesc"),
      done: hasDevice,
      href: "/devices?action=create",
      icon: MonitorSmartphone,
    },
    {
      label: t("dashboard.setupConfiguration"),
      description: t("dashboard.setupConfigurationDesc"),
      done: hasConfiguredDevice,
      href: "/devices",
      icon: Palette,
    },
    {
      label: t("dashboard.setupReady"),
      description: t("dashboard.setupReadyDesc"),
      done: hasReadyDevice,
      href: "/devices",
      icon: Settings2,
    },
  ];
  const completed = steps.filter((step) => step.done).length;
  const nextStep = steps.find((step) => !step.done) ?? steps[steps.length - 1];

  return (
    <Card className="overflow-hidden border-[#00357B]/15 bg-white shadow-sm shadow-blue-950/[0.04]">
      <CardContent className="p-0">
        <div className="flex flex-col gap-5 border-b border-zinc-100 bg-[#f7f9ff] p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#00357B]">
              <span className="size-1.5 rounded-full bg-[#F5A3AE]" />
              {t("dashboard.setupEyebrow")}
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">
              {t("dashboard.setupTitle")}
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-zinc-500">
              {t("dashboard.setupDescription")}
            </p>
          </div>
          <div className="shrink-0 rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
              {t("dashboard.setupProgressLabel")}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-950">
              {t("dashboard.setupProgress")
                .replace("{completed}", String(completed))
                .replace("{total}", String(steps.length))}
            </p>
          </div>
        </div>

        <div className="grid gap-2 p-4 sm:p-5 lg:grid-cols-2">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.label}
                className={`flex min-w-0 items-start gap-3 rounded-2xl border p-3.5 ${
                  step.done
                    ? "border-emerald-100 bg-emerald-50/40"
                    : "border-zinc-100 bg-white"
                }`}
              >
                <div
                  className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                    step.done
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {step.done ? <Check className="size-4" /> : <Icon className="size-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-950">{step.label}</p>
                  <p className="mt-0.5 text-xs leading-5 text-zinc-500">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-zinc-500">{nextStep.description}</p>
          <Link
            href={nextStep.href}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-[#00357B] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#014EB4]"
          >
            {nextStep.label}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
