"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RotateCw,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { LatestAppRelease } from "@/features/root/home/api";
import {
  heroWorkspacePreviews,
  landingContent,
} from "@/features/root/home/landing-content";

gsap.registerPlugin(ScrollTrigger);

export function HeroSection({
  latestRelease,
}: {
  latestRelease: LatestAppRelease | null;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const [activePreview, setActivePreview] = useState(0);
  const preview = heroWorkspacePreviews[activePreview];

  useLayoutEffect(() => {
    if (!sectionRef.current) return;

    const context = gsap.context(() => {
      const media = gsap.matchMedia();

      media.add(
        {
          reduced: "(prefers-reduced-motion: reduce)",
        },
        ({ conditions }) => {
          const { reduced } = conditions as {
            reduced: boolean;
          };

          gsap.set("[data-hero-copy]", {
            autoAlpha: reduced ? 1 : 0,
            y: reduced ? 0 : 24,
            filter: reduced ? "blur(0px)" : "blur(10px)",
          });
          gsap.set("[data-hero-workspace]", {
            autoAlpha: reduced ? 1 : 0,
            y: reduced ? 0 : 56,
            scale: reduced ? 1 : 0.97,
          });
          gsap.set("[data-hero-scroll-note]", {
            autoAlpha: reduced ? 1 : 0,
            y: reduced ? 0 : 12,
          });

          if (reduced) return;

          gsap
            .timeline({ defaults: { ease: "power3.out" } })
            .to("[data-hero-copy]", {
              autoAlpha: 1,
              y: 0,
              filter: "blur(0px)",
              duration: 0.75,
              stagger: 0.08,
            })
            .to(
              "[data-hero-workspace]",
              { autoAlpha: 1, y: 0, scale: 1, duration: 0.95 },
              "-=0.35",
            )
            .to(
              "[data-hero-scroll-note]",
              { autoAlpha: 1, y: 0, duration: 0.45 },
              "-=0.35",
            );

        },
      );

      return () => media.revert();
    }, sectionRef);

    return () => context.revert();
  }, []);

  function changePreview(direction: number) {
    setActivePreview((current) =>
      (current + direction + heroWorkspacePreviews.length) %
      heroWorkspacePreviews.length,
    );
  }

  return (
    <section
      ref={sectionRef}
      className="hero-gradient-poskart relative isolate overflow-hidden border-b border-blue-100 text-zinc-950"
    >
      <div className="relative min-h-[100dvh] overflow-hidden">
        <div className="pointer-events-none absolute inset-x-5 top-24 bottom-8 border-x border-t border-blue-950/10 sm:inset-x-8 lg:inset-x-12" />

        <div className="relative mx-auto max-w-[90rem] px-5 pb-16 pt-28 sm:px-8 sm:pt-32 lg:px-12 lg:pb-20">
          <div data-hero-copy className="mx-auto max-w-[78rem]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00357B]">
              {landingContent.hero.eyebrow}
            </p>
            <div className="mt-5">
              <h1 className="whitespace-nowrap text-[clamp(1.85rem,5.8vw,5.25rem)] font-black uppercase leading-[0.9] tracking-[-0.05em]">
                Photobooth Sesuai
                <br />
                <span className="text-[#00357B]">Brand Anda</span>
              </h1>
              <div className="mt-7 max-w-lg">
                <p className="text-base leading-7 text-zinc-600 sm:text-lg">
                  {landingContent.hero.description}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/register"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#00357B] px-5 text-sm font-bold text-white transition-[background-color,transform] duration-200 hover:bg-[#014EB4] active:translate-y-px"
                  >
                    Coba gratis 14 hari <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href="#features"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-[#00357B]/20 bg-white/65 px-5 text-sm font-bold text-[#00357B] transition-[background-color,transform] duration-200 hover:bg-white active:translate-y-px"
                  >
                    Lihat fitur
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div
            data-hero-workspace
            className="relative z-10 mx-auto mt-12 w-[calc(100%+2rem)] max-w-[86rem] sm:mt-16 lg:mt-14 lg:w-[120%]"
          >
            <WorkspacePreview
              activePreview={activePreview}
              latestRelease={latestRelease}
              onChangePreview={setActivePreview}
              onNext={() => changePreview(1)}
              onPrevious={() => changePreview(-1)}
              preview={preview}
            />
          </div>

          <div
            data-hero-scroll-note
            className="relative z-30 mx-auto mt-8 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500"
          >
            <ArrowDown className="size-4 text-[#00357B]" />
            Scroll untuk melihat fitur
          </div>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[clamp(14rem,30vw,26rem)] bg-gradient-to-b from-transparent via-white/75 to-white"
        />
      </div>
    </section>
  );
}

function WorkspacePreview({
  activePreview,
  latestRelease,
  onChangePreview,
  onNext,
  onPrevious,
  preview,
}: {
  activePreview: number;
  latestRelease: LatestAppRelease | null;
  onChangePreview: (index: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  preview: (typeof heroWorkspacePreviews)[number];
}) {
  return (
    <div
      aria-label="Preview workspace POSKART"
      className="relative grid overflow-hidden rounded-2xl border border-blue-200/80 bg-[#e9eef7] shadow-[0_26px_65px_rgba(0,53,123,0.18)] lg:grid-cols-[15rem_minmax(0,1fr)]"
    >
      <nav
        aria-label="Bagian software POSKART"
        className="order-2 flex gap-1 overflow-x-auto border-t border-blue-200 bg-[#dfe7f3] p-2 lg:order-1 lg:min-h-[31rem] lg:flex-col lg:gap-2 lg:border-r lg:border-t-0 lg:p-4"
      >
        <div className="hidden items-center gap-1.5 px-2 pb-3 lg:flex">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="mb-1 hidden truncate rounded-lg border border-blue-200 bg-white/65 px-3 py-2 text-xs text-zinc-500 lg:block">
          poskart.my.id
        </div>
        <p className="hidden px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 lg:block">
          POSKART software
        </p>
        {heroWorkspacePreviews.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-current={activePreview === index ? "page" : undefined}
            onClick={() => onChangePreview(index)}
            className={
              activePreview === index
                ? "relative shrink-0 rounded-lg bg-white px-3 py-2.5 text-left text-xs font-semibold text-[#00357B] shadow-sm before:absolute before:inset-y-2 before:-left-1 before:w-0.5 before:bg-[#00357B] lg:w-full"
                : "relative shrink-0 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-zinc-500 transition-colors hover:bg-white/70 hover:text-zinc-900 lg:w-full"
            }
          >
            <span className="mr-2 inline-block size-2 rounded-full bg-[#00357B]/40 align-middle" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="order-1 min-w-0 bg-white/65 p-2 lg:order-2 lg:p-3">
        <div className="flex h-9 items-center gap-2 border-b border-blue-100 px-3 text-xs text-zinc-400">
          <button
            type="button"
            aria-label="Preview sebelumnya"
            onClick={onPrevious}
            className="rounded p-1 transition-colors hover:bg-blue-50 hover:text-[#00357B]"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Preview berikutnya"
            onClick={onNext}
            className="rounded p-1 transition-colors hover:bg-blue-50 hover:text-[#00357B]"
          >
            <ChevronRight className="size-4" />
          </button>
          <RotateCw className="ml-1 size-3.5" />
          <span className="ml-2 min-w-0 truncate rounded-md bg-blue-50/70 px-3 py-1.5 text-[10px] text-zinc-500">
            {preview.url}
          </span>
          <span className="ml-auto hidden text-[10px] font-medium text-zinc-400 sm:block">
            {latestRelease ? `v${latestRelease.version}` : "POSKART"}
          </span>
        </div>
        <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-blue-100 bg-[#f7f9ff]">
          <Image
            key={preview.id}
            src={preview.image.src}
            alt={preview.image.alt}
            width={1600}
            height={1100}
            sizes="(max-width: 1023px) 95vw, 75vw"
            priority={activePreview === 0}
            className="h-full w-full object-cover object-top transition-opacity duration-300"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-white/95 via-white/60 to-transparent px-5 pb-4 pt-14 sm:px-8 sm:pb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#00357B]">
              {preview.label}
            </p>
            <p className="mt-1 max-w-lg text-sm font-medium text-zinc-700 sm:text-base">
              {preview.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
