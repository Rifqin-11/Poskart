"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CreditCard,
  GalleryHorizontal,
  MonitorCheck,
  Monitor,
  Palette,
  Printer,
  Smartphone,
  Tablet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type DeviceKey = "web" | "tablet" | "mobile";

// Replace these example paths when the final device screenshots are ready.
const devicePreviews: Record<
  DeviceKey,
  { label: string; image: string; imageAlt: string; icon: LucideIcon }
> = {
  web: {
    label: "Web",
    image: "/POSKART Photobooth.png",
    imageAlt: "POSKART web dashboard preview",
    icon: Monitor,
  },
  tablet: {
    label: "Tablet",
    image: "/iPad Pro 11.png",
    imageAlt: "POSKART tablet builder preview",
    icon: Tablet,
  },
  mobile: {
    label: "Mobile",
    image: "/iPhone 13 Pro.png",
    imageAlt: "POSKART mobile dashboard preview",
    icon: Smartphone,
  },
};

const metrics = [
  { value: "1", label: "workspace for every booth" },
  { value: "6", label: "connected customer screens" },
  { value: "24/7", label: "device visibility" },
  { value: "0", label: "code needed to redesign" },
];

export function ProductShowcase() {
  const [hoveredDevice, setHoveredDevice] = useState<DeviceKey | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<DeviceKey | null>(null);
  const previewDevice = hoveredDevice ?? selectedDevice;
  const preview = previewDevice ? devicePreviews[previewDevice] : null;

  return (
    <section id="features" className="scroll-mt-[72px] bg-white">
      <div className="mx-auto max-w-[90rem] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              The command center
            </p>
            <p className="mt-5 max-w-md text-base leading-8 text-zinc-600">
              POSKART brings the visual builder, kiosk, payments, printing,
              galleries, and daily operations into one clear system.
            </p>
          </div>
          <h2 className="text-4xl font-black uppercase leading-[0.92] tracking-normal sm:text-6xl lg:text-7xl">
            Inspect the real booth, not another abstract dashboard.
          </h2>
        </div>

        <div className="relative mt-14 overflow-hidden border border-zinc-200 bg-[#f4f5f7] px-3 pt-8 sm:px-8 sm:pt-12 lg:px-12">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-300 pb-5 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            <span>Live product surface</span>
            <div className="flex items-center gap-1 rounded-full border border-zinc-300 bg-white/70 p-1 normal-case tracking-normal">
              {(Object.keys(devicePreviews) as DeviceKey[]).map((deviceKey) => {
                const device = devicePreviews[deviceKey];
                const Icon = device.icon;
                const isActive = previewDevice === deviceKey;

                return (
                  <button
                    key={deviceKey}
                    type="button"
                    aria-label={`Preview ${device.label}`}
                    aria-pressed={selectedDevice === deviceKey}
                    onMouseEnter={() => setHoveredDevice(deviceKey)}
                    onMouseLeave={() => setHoveredDevice(null)}
                    onFocus={() => setHoveredDevice(deviceKey)}
                    onBlur={() => setHoveredDevice(null)}
                    onClick={() =>
                      setSelectedDevice((current) =>
                        current === deviceKey ? null : deviceKey,
                      )
                    }
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[10px] font-semibold transition-colors",
                      isActive
                        ? "bg-zinc-950 text-white"
                        : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {device.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative mt-4 aspect-[16/9] min-h-[220px] overflow-hidden sm:min-h-[360px] lg:min-h-0">
            <Image
              src="/Poskart hero.png"
              alt="POSKART product suite on desktop, tablet, and mobile"
              width={1920}
              height={1080}
              className={cn(
                "absolute inset-0 mx-auto h-full w-full max-w-6xl object-contain transition-opacity duration-300",
                preview ? "opacity-0" : "opacity-100",
              )}
            />

            {preview && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Image
                  key={previewDevice}
                  src={preview.image}
                  alt={preview.imageAlt}
                  width={1600}
                  height={1100}
                  className="h-full w-full max-w-6xl object-contain drop-shadow-[0_24px_24px_rgba(24,24,27,0.18)]"
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 grid border-y border-zinc-200 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="border-b border-zinc-200 py-7 sm:px-6 lg:border-b-0 lg:border-r last:lg:border-r-0"
            >
              <p className="text-4xl font-black tracking-normal text-zinc-950">
                {metric.value}
              </p>
              <p className="mt-2 text-sm text-zinc-500">{metric.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const workflow = [
  {
    icon: Palette,
    step: "Build",
    description:
      "Design themes and frames in the browser, then publish them to the right booth.",
  },
  {
    icon: Camera,
    step: "Capture",
    description:
      "Guide guests from payment and frame selection through camera and preview.",
  },
  {
    icon: Printer,
    step: "Print",
    description:
      "Send protected print jobs with retry controls and session-aware limits.",
  },
  {
    icon: GalleryHorizontal,
    step: "Deliver",
    description:
      "Upload every result and share it through a time-limited customer gallery.",
  },
];

export function WorkflowBand() {
  return (
    <section
      id="builder"
      className="scroll-mt-[72px] bg-[#e5e5e1] text-zinc-950"
    >
      <div className="mx-auto max-w-[90rem] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div className="flex flex-col justify-between gap-8 border-b border-zinc-950/20 pb-10 lg:flex-row lg:items-end">
          <h2 className="max-w-4xl text-4xl font-black uppercase leading-[0.92] tracking-normal sm:text-6xl lg:text-7xl">
            A simple guest journey. A serious operating system behind it.
          </h2>
          <div className="flex gap-3">
            <MonitorCheck className="size-6" />
            <CreditCard className="size-6" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4">
          {workflow.map(({ icon: Icon, step, description }, index) => (
            <article
              key={step}
              className="border-b border-zinc-950/20 py-9 md:px-6 lg:border-b-0 lg:border-r first:lg:pl-0 last:lg:border-r-0"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.18em]">
                  0{index + 1}
                </span>
                <Icon className="size-5" />
              </div>
              <h3 className="mt-12 text-2xl font-black uppercase">{step}</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-600">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingCTA({ planLabel }: { planLabel: string | null }) {
  return (
    <section className="bg-zinc-950 text-white">
      <div className="mx-auto grid max-w-[90rem] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-end lg:px-12 lg:py-28">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Ready for the next event?
          </p>
          <h2 className="mt-6 max-w-5xl text-5xl font-black uppercase leading-[0.88] tracking-normal sm:text-7xl lg:text-8xl">
            Put your booth on a better system.
          </h2>
          {planLabel && (
            <p className="mt-6 text-sm text-zinc-400">{planLabel}</p>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Link
            href="/register"
            className="inline-flex h-12 items-center justify-center gap-2 bg-white px-6 text-sm font-bold text-zinc-950 transition-colors hover:bg-zinc-200"
          >
            Start with POSKART <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-12 items-center justify-center border border-white/35 px-6 text-sm font-bold text-white transition-colors hover:bg-white hover:text-zinc-950"
          >
            Talk to us
          </Link>
        </div>
      </div>
    </section>
  );
}
