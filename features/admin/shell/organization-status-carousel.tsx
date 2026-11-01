"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  MonitorSmartphone,
  Settings2,
} from "lucide-react";
import { useBooths } from "@/features/admin/devices/use-devices";
import {
  deviceNeedsAttention,
  hasMinimumDeviceConfiguration,
  isDeviceOnline,
  isDeviceReady,
} from "@/features/admin/devices/device-readiness";
import { useI18n } from "@/lib/i18n/i18n-provider";
import type { Device } from "@/types/device";

type OrganizationStatusCarouselProps = {
  hasActiveSubscription: boolean;
  subscriptionStatus?: string | null;
  planName?: string | null;
  expiry?: string | null;
  loading?: boolean;
  onNavigate?: () => void;
};

type OperationalState = "ready" | "setup" | "attention" | "subscription";

function getOperationalState(
  hasActiveSubscription: boolean,
  devices: Device[],
): OperationalState {
  if (!hasActiveSubscription) return "subscription";
  if (devices.length === 0) return "setup";

  const readyDevices = devices.filter(isDeviceReady);

  if (readyDevices.length === devices.length) return "ready";
  if (deviceNeedsAttentionForAny(devices)) return "attention";

  return "setup";
}

function deviceNeedsAttentionForAny(devices: Device[]) {
  return devices.some(deviceNeedsAttention);
}

export function OrganizationStatusCarousel({
  hasActiveSubscription,
  subscriptionStatus,
  planName,
  expiry,
  loading = false,
  onNavigate,
}: OrganizationStatusCarouselProps) {
  const { t } = useI18n();
  const { data: deviceData = [], isLoading: devicesLoading } = useBooths();
  const devices = deviceData;
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoading = loading || devicesLoading;

  if (isLoading) {
    return (
      <div
        data-admin-tour="organization"
        className="mt-3 shrink-0 rounded-3xl border border-zinc-100 bg-white/90 p-3 shadow-sm shadow-zinc-200/70"
      >
        <div className="h-[78px] animate-pulse rounded-2xl bg-zinc-100" />
        <div className="mt-1 h-6 animate-pulse rounded-xl bg-zinc-50" />
      </div>
    );
  }

  const operationalState = getOperationalState(
    hasActiveSubscription,
    devices,
  );
  const onlineDevices = devices.filter(isDeviceOnline).length;
  const readyDevices = devices.filter(isDeviceReady).length;
  const configuredDevices = devices.filter(hasMinimumDeviceConfiguration).length;
  const attentionDevices = devices.filter(deviceNeedsAttention).length;
  const stateMeta: Record<
    OperationalState,
    {
      label: string;
      description: string;
      href: string;
      icon: typeof CheckCircle2;
      tone: string;
      iconTone: string;
    }
  > = {
    ready: {
      label: t("sidebar.readyToUse"),
      description: t("sidebar.readyDetail")
        .replace("{ready}", String(readyDevices))
        .replace("{total}", String(devices.length)),
      href: "/devices",
      icon: CheckCircle2,
      tone: "border-emerald-100 bg-emerald-50/70",
      iconTone: "text-emerald-600",
    },
    setup: {
      label: t("sidebar.setupNeeded"),
      description:
        devices.length === 0
          ? t("sidebar.setupNoDevices")
          : configuredDevices < devices.length
            ? t("sidebar.setupDetail")
                .replace("{configured}", String(configuredDevices))
                .replace("{total}", String(devices.length))
            : t("sidebar.setupWaitingForSync").replace(
                "{count}",
                String(devices.length - readyDevices),
              ),
      href: devices.length === 0 ? "/devices?action=create" : "/devices",
      icon: Settings2,
      tone: "border-amber-100 bg-amber-50/70",
      iconTone: "text-amber-600",
    },
    attention: {
      label: t("sidebar.attentionNeeded"),
      description: t("sidebar.attentionDetail").replace(
        "{count}",
        String(attentionDevices),
      ),
      href: "/devices",
      icon: AlertTriangle,
      tone: "border-red-100 bg-red-50/70",
      iconTone: "text-red-600",
    },
    subscription: {
      label: t("sidebar.activateSubscription"),
      description: t("sidebar.subscriptionRequired"),
      href: "/settings?tab=organization&subscription=required",
      icon: CreditCard,
      tone: "border-amber-100 bg-amber-50/70",
      iconTone: "text-amber-600",
    },
  };

  const currentState = stateMeta[operationalState];
  const subscriptionLabel = hasActiveSubscription
    ? subscriptionStatus === "trialing"
      ? t("sidebar.subscriptionTrial")
      : t("sidebar.subscriptionActive")
    : t("sidebar.subscriptionInactive");
  const slides = [
    {
      eyebrow: t("sidebar.operationalStatus"),
      title: currentState.label,
      description: currentState.description,
      href: currentState.href,
      icon: currentState.icon,
      tone: currentState.tone,
      iconTone: currentState.iconTone,
    },
    {
      eyebrow: t("sidebar.deviceStatus"),
      title: t("sidebar.devicesOnline")
        .replace("{online}", String(onlineDevices))
        .replace("{total}", String(devices.length)),
      description:
        devices.length === 0
          ? t("sidebar.setupNoDevices")
          : t("sidebar.deviceSlideDetail").replace(
              "{ready}",
              String(readyDevices),
            ),
      href: "/devices",
      icon: MonitorSmartphone,
      tone: "border-blue-100 bg-blue-50/70",
      iconTone: "text-[#00357B]",
    },
    {
      eyebrow: t("sidebar.subscription"),
      title: subscriptionLabel,
      description: `${planName ?? "Free"} · ${expiry || "—"}`,
      href: "/settings?tab=organization",
      icon: CreditCard,
      tone: hasActiveSubscription
        ? "border-emerald-100 bg-emerald-50/70"
        : "border-amber-100 bg-amber-50/70",
      iconTone: hasActiveSubscription ? "text-emerald-600" : "text-amber-600",
    },
  ];

  const scrollToSlide = (index: number) => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({
      left: index * element.clientWidth,
      behavior: "smooth",
    });
    setActiveSlide(index);
  };

  return (
    <div
      data-admin-tour="organization"
      className={`mt-3 shrink-0 rounded-3xl border bg-white/90 p-3 shadow-sm shadow-zinc-200/70 ${
        hasActiveSubscription ? "border-emerald-200/80" : "border-amber-200/80"
      }`}
    >
      <div
        ref={scrollRef}
        onScroll={(event) => {
          const element = event.currentTarget;
          if (element.clientWidth === 0) return;
          setActiveSlide(Math.round(element.scrollLeft / element.clientWidth));
        }}
        className="flex min-h-[78px] snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-roledescription="carousel"
        aria-label={t("sidebar.carouselLabel")}
      >
        {slides.map((slide) => {
          const Icon = slide.icon;
          return (
            <Link
              key={slide.eyebrow}
              href={slide.href}
              onClick={onNavigate}
              className={`flex w-full min-h-[78px] shrink-0 snap-start items-center rounded-2xl border p-3 transition-colors hover:border-zinc-300 ${slide.tone}`}
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-white/90 shadow-sm">
                  <Icon className={`size-4 ${slide.iconTone}`} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                    {slide.eyebrow}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-zinc-950">
                    {slide.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 whitespace-normal text-[11px] leading-4 text-zinc-500">
                    {slide.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-1 flex min-h-6 items-center justify-between px-1">
        <span className="text-[10px] text-zinc-400">{t("sidebar.swipeHint")}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => scrollToSlide(Math.max(0, activeSlide - 1))}
            disabled={activeSlide === 0}
            className="grid size-6 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-30"
            aria-label={t("sidebar.previousSlide")}
          >
            <ChevronLeft className="size-3.5" />
          </button>
          {slides.map((slide, index) => (
            <button
              key={slide.eyebrow}
              type="button"
              onClick={() => scrollToSlide(index)}
              className={`h-1.5 rounded-full transition-all ${
                activeSlide === index ? "w-4 bg-zinc-950" : "w-1.5 bg-zinc-300"
              }`}
              aria-label={`${t("sidebar.goToSlide")} ${index + 1}`}
              aria-current={activeSlide === index ? "true" : undefined}
            />
          ))}
          <button
            type="button"
            onClick={() => scrollToSlide(Math.min(slides.length - 1, activeSlide + 1))}
            disabled={activeSlide === slides.length - 1}
            className="grid size-6 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-30"
            aria-label={t("sidebar.nextSlide")}
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
