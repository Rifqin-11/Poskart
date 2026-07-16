"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Download, MoveDownRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { LatestAppRelease } from "@/features/root/home/api";

gsap.registerPlugin(ScrollTrigger);

export function HeroSection({
  latestRelease,
}: {
  latestRelease: LatestAppRelease | null;
}) {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!sectionRef.current) return;

    const context = gsap.context(() => {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      gsap.set("[data-hero-panel]", {
        autoAlpha: 1,
        y: 0,
        yPercent: 100,
      });

      if (reduceMotion) {
        gsap.set("[data-hero-reveal]", { opacity: 1, y: 0 });
        gsap.set("[data-hero-panel]", { yPercent: 0 });
        gsap.set(sectionRef.current, { minHeight: "100svh" });
        return;
      }

      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .fromTo(
          "[data-hero-line]",
          { yPercent: 105 },
          { yPercent: 0, duration: 0.9, stagger: 0.08 },
        )
        .fromTo(
          "[data-hero-reveal]",
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.65, stagger: 0.08 },
          "-=0.45",
        )
        .fromTo(
          "[data-hero-product]",
          { y: 80, rotate: 2 },
          { y: 0, rotate: 0, duration: 1 },
          "-=0.55",
        );

      gsap
        .timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        })
        .to(
          "[data-hero-panel]",
          { yPercent: 0, duration: 0.24, ease: "power2.out" },
          0.12,
        )
        .to(
          "[data-hero-line]",
          { opacity: 0, y: -80, stagger: 0.025, duration: 0.7, ease: "none" },
          0.3,
        )
        .to(
          "[data-hero-reveal]",
          { opacity: 0, y: -34, duration: 0.7, ease: "none" },
          0.3,
        )
        .to(
          "[data-hero-product-scroll]",
          {
            opacity: 0.08,
            y: -150,
            scale: 0.9,
            duration: 0.7,
            ease: "none",
          },
          0.3,
        )
        .to(
          "[data-hero-accent]",
          {
            opacity: 0,
            y: -48,
            rotate: 16,
            duration: 0.7,
            ease: "none",
          },
          0.3,
        )
        .to(
          "[data-hero-panel]",
          {
            left: 0,
            right: 0,
            height: "100%",
            borderRadius: 0,
            duration: 0.64,
            ease: "none",
          },
          0.36,
        )
        .to(
          "[data-hero-panel-content]",
          {
            y: () => (window.innerWidth < 640 ? 88 : 110),
            duration: 0.64,
            ease: "none",
          },
          0.36,
        )
        .to(
          "[data-hero-scroll]",
          { opacity: 0, y: 16, duration: 0.24, ease: "none" },
          0.12,
        );
    }, sectionRef);

    return () => context.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative isolate min-h-[175svh] bg-[#ececea] text-zinc-950"
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-x-5 top-24 bottom-20 border-x border-t border-zinc-950/10 sm:inset-x-8 lg:inset-x-12" />

        <div className="relative mx-auto h-full max-w-[90rem] px-5 pt-28 sm:px-8 sm:pt-32 lg:px-12">
          <div
            data-hero-reveal
            className="flex items-center justify-between gap-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600">
              The operating system for modern photobooths
            </p>
            <p className="hidden text-xs text-zinc-600 md:block">
              Built for Android kiosk · Managed from the web
            </p>
          </div>

          <div className="relative mt-8 lg:mt-6">
            <div
              data-hero-accent
              className="absolute -left-2 top-0 z-10 hidden text-[7rem] font-black leading-none text-zinc-300 sm:block lg:-left-5 lg:text-[9rem]"
              aria-hidden="true"
            >
              #
            </div>

            <h1 className="relative z-[1] text-center text-[2.45rem] font-black uppercase leading-[0.82] tracking-normal min-[375px]:text-[2.75rem] sm:text-[6.5rem] lg:text-[9.25rem] xl:text-[11rem]">
              <span className="block overflow-hidden">
                <span data-hero-line className="block">
                  POSKART
                </span>
              </span>
              <span className="block overflow-hidden">
                <span data-hero-line className="block">
                  PHOTOBOOTH
                </span>
              </span>
              <span className="block overflow-hidden">
                <span data-hero-line className="block">
                  OS
                </span>
              </span>
            </h1>

            <MoveDownRight
              data-hero-accent
              className="absolute right-[5%] top-[32%] z-10 hidden size-28 stroke-[2.5] text-zinc-400 sm:block lg:size-40"
              aria-hidden="true"
            />

            <div
              data-hero-product-scroll
              className="relative z-10 mx-auto -mt-16 w-full max-w-5xl sm:-mt-28 lg:-mt-44"
            >
              <div data-hero-product>
                <Image
                  src="/Poskart hero.png"
                  alt="POSKART dashboard, visual builder, and device management across desktop, tablet, and mobile"
                  width={1920}
                  height={1080}
                  priority
                  className="h-auto w-full object-contain drop-shadow-[0_32px_35px_rgba(0,0,0,0.28)]"
                />
              </div>
            </div>
          </div>
        </div>

        <div
          data-hero-panel
          className="invisible absolute inset-x-5 bottom-0 z-20 h-[390px] overflow-hidden rounded-t-[28px] border border-b-0 border-zinc-200 bg-white text-zinc-950 opacity-0 shadow-[0_-20px_60px_rgba(24,24,27,0.08)] sm:inset-x-8 sm:h-[250px] lg:inset-x-12 lg:h-[180px]"
        >
          <div
            data-hero-panel-content
            className="mx-auto h-full max-w-[90rem] px-5 py-6 sm:px-8 lg:px-10 lg:py-8"
          >
            <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
              <div>
                <p className="max-w-2xl text-lg font-medium leading-7 sm:text-xl">
                  Design the booth, take payments, sync devices, print, and
                  deliver every memory from one connected workspace.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  <span className="border border-zinc-200 px-3 py-2">
                    Visual builder
                  </span>
                  <span className="border border-zinc-200 px-3 py-2">
                    Offline kiosk
                  </span>
                  <span className="border border-zinc-200 px-3 py-2">
                    QRIS + print
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                <a
                  href="/download/app"
                  className="inline-flex h-12 items-center justify-center gap-2 bg-zinc-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
                >
                  <Download className="size-4" />
                  Download {latestRelease?.version ?? "App"}
                </a>
                <Link
                  href="/subscriptions"
                  className="inline-flex h-12 items-center justify-center gap-2 border border-zinc-300 bg-white px-5 text-sm font-semibold transition-colors hover:border-zinc-950"
                >
                  View pricing <ArrowUpRight className="size-4" />
                </Link>
              </div>
            </div>

            <div className="mt-16 grid gap-8 border-t border-zinc-200 pt-10 sm:mt-20 lg:mt-28 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Scroll the booth journey
              </p>
              <h2 className="max-w-4xl text-4xl font-black uppercase leading-[0.92] tracking-normal sm:text-6xl lg:text-7xl">
                One connected flow from idea to printed memory.
              </h2>
            </div>
          </div>
        </div>

        <a
          data-hero-scroll
          href="#platform"
          aria-label="Explore the POSKART workflow"
          className="absolute bottom-8 right-8 z-30 hidden size-12 items-center justify-center rounded-full border border-white/80 bg-white/65 text-zinc-950 shadow-lg backdrop-blur-xl transition-transform hover:translate-y-1 lg:flex"
        >
          <ArrowDown className="size-5" />
        </a>
      </div>
    </section>
  );
}
