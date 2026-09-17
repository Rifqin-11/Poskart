"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LandingButton } from "@/components/ui/landing-button";
import { landingAssets } from "@/features/root/home/landing-content";

gsap.registerPlugin(ScrollTrigger);

/**
 * Pure HTML/CSS mockup of a printed receipt photo booth strip.
 *
 * No image asset is used: the paper, perforation, grain, photo frames, and
 * footer are all drawn with CSS so the receipt scales cleanly and never
 * blocks the hero's LCP screenshot.
 */
function ReceiptMockup() {
  return (
    <div className="w-[168px] rotate-[-5deg] sm:w-[184px]">
      {/* Paper */}
      <div className="relative overflow-hidden rounded-[6px] bg-white shadow-[0_26px_50px_rgba(0,30,80,0.35)]">
        {/* Subtle paper grain */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:repeating-linear-gradient(0deg,rgba(0,0,0,0.045)_0px,rgba(0,0,0,0.045)_1px,transparent_1px,transparent_4px)]"
        />

        {/* Perforated top edge */}
        <div
          aria-hidden="true"
          className="h-2 w-full [background-image:radial-gradient(circle_at_4px_0,transparent_3px,#ffffff_3px)] [background-size:8px_8px]"
        />

        <div className="relative px-4 pb-4 pt-2 font-mono text-zinc-700">
          {/* Header */}
          <p className="text-center text-[10px] font-bold tracking-[0.22em] text-zinc-900">
            POSKART
          </p>
          <p className="mt-1 text-center text-[8px] tracking-[0.18em] text-zinc-500">
            RECEIPT PHOTOBOOTH
          </p>

          <div className="my-2.5 border-t border-dashed border-zinc-300" />

          {/* Meta rows */}
          <div className="space-y-1 text-[8px] leading-4">
            <div className="flex justify-between">
              <span className="text-zinc-500">DATE</span>
              <span>17.09.2026</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">TIME</span>
              <span>19:42 WIB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">BOOTH</span>
              <span>#02</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">ORDER</span>
              <span>#00142</span>
            </div>
          </div>

          <div className="my-2.5 border-t border-dashed border-zinc-300" />

          {/* Photo strip: two CSS-drawn frames */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="relative aspect-[3/4] overflow-hidden rounded-[4px] bg-[linear-gradient(150deg,#dbeafe_0%,#93c5fd_55%,#60a5fa_100%)]">
              <div className="absolute inset-x-1 bottom-1 h-1.5 rounded-full bg-white/50" />
              <div className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />
            </div>
            <div className="relative aspect-[3/4] overflow-hidden rounded-[4px] bg-[linear-gradient(210deg,#bfdbfe_0%,#7dd3fc_50%,#38bdf8_100%)]">
              <div className="absolute inset-x-1 bottom-1 h-1.5 rounded-full bg-white/50" />
              <div className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />
            </div>
          </div>

          <div className="my-2.5 border-t border-dashed border-zinc-300" />

          {/* Footer */}
          <p className="text-center text-[8px] tracking-[0.2em] text-zinc-500">
            THANK YOU
          </p>

          {/* CSS QR placeholder */}
          <div className="mx-auto mt-2 grid size-9 grid-cols-5 gap-px">
            {QR_CELLS.map((filled, index) => (
              <span
                key={index}
                className={filled ? "bg-zinc-800" : "bg-zinc-200"}
              />
            ))}
          </div>
        </div>

        {/* Perforated bottom edge */}
        <div
          aria-hidden="true"
          className="h-2 w-full [background-image:radial-gradient(circle_at_4px_8px,transparent_3px,#ffffff_3px)] [background-size:8px_8px]"
        />
      </div>
    </div>
  );
}

/* Aggregate operational figures shown under the hero CTAs. */
const heroStats = [
  { value: "1000+", label: "prints" },
  { value: "700+", label: "sessions" },
  { value: "99%", label: "qris berhasil" },
  { value: "97%", label: "session berhasil" },
] as const;

/* Fixed pseudo-random pattern for the CSS QR square. */
const QR_CELLS = [
  1, 1, 1, 0, 1,
  1, 0, 0, 1, 1,
  0, 1, 1, 0, 1,
  1, 1, 0, 1, 0,
  1, 0, 1, 1, 1,
];

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const desktopVisualRef = useRef<HTMLDivElement>(null);
  const mobileVisualRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDListElement>(null);

  useLayoutEffect(() => {
    if (!sectionRef.current) return;

    const context = gsap.context(() => {
      const media = gsap.matchMedia();

      /*
       * Never return `media.revert()` from these callbacks: a matchMedia context
       * already reverts everything it created when the query stops matching, and
       * calling revert() from inside its own cleanup recurses until the stack
       * overflows.
       */
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const copyItems = copyRef.current?.querySelectorAll("[data-hero-copy]");

        if (copyItems?.length) {
          gsap.from(copyItems, {
            y: 16,
            duration: 0.7,
            stagger: 0.08,
            ease: "power3.out",
            delay: 0.12,
            clearProps: "transform",
          });
        }

        if (statsRef.current) {
          gsap.from(statsRef.current.children, {
            y: 14,
            duration: 0.6,
            stagger: 0.07,
            ease: "power3.out",
            delay: 0.4,
            clearProps: "transform",
          });
        }
      });

      media.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        if (!desktopVisualRef.current) return;

        const layers = desktopVisualRef.current.querySelectorAll("[data-hero-layer]");
        gsap.from(layers, {
          y: 22,
          duration: 0.85,
          stagger: 0.1,
          ease: "power3.out",
          delay: 0.2,
        });

        gsap.to(copyRef.current, {
          y: -24,
          opacity: 0.82,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.7,
          },
        });
        gsap.to(desktopVisualRef.current, {
          y: -44,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.9,
          },
        });
      });

      media.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)", () => {
        if (!mobileVisualRef.current) return;
        gsap.from(mobileVisualRef.current.children, {
          y: 14,
          duration: 0.7,
          stagger: 0.1,
          ease: "power3.out",
          delay: 0.16,
          clearProps: "transform",
        });
      });
    }, sectionRef);

    return () => context.revert();
  }, []);

  return (
    <section ref={sectionRef} className="flex min-h-[100dvh] items-center bg-[#F7F8FA] px-3 py-24 sm:px-6 sm:py-28 lg:px-10 lg:py-32">
      <div className="mx-auto w-full max-w-[90rem]">
        {/* Banner and its overlapping screenshots share one positioning context. */}
        <div className="relative">
          {/* Full-width blue banner reaching the corners of the container */}
          <div className="relative overflow-hidden rounded-[28px] border border-white/40 bg-[radial-gradient(120%_130%_at_20%_20%,#5FA8FF_0%,#1F6FD0_52%,#014EB4_100%)] px-6 py-12 shadow-[0_28px_70px_rgba(0,53,123,0.22)] sm:rounded-[36px] sm:px-10 sm:py-16 lg:px-16 lg:py-20">
            <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-4">
              {/* Left: Copy */}
              <div ref={copyRef} className="relative z-30 text-white">
                <p data-hero-copy className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
                  Poskart Receipt Photobooth
                </p>
                <h1 data-hero-copy className="mt-5 max-w-xl text-[clamp(2rem,4.6vw,3.5rem)] font-black leading-[1.04] tracking-tight text-white">
                  Receipt Photobooth App untuk bisnis Anda.
                </h1>
                <p data-hero-copy className="mt-5 max-w-lg text-base leading-7 text-white/85 sm:text-lg">
                  Kelola tampilan, transaksi, perangkat, dan hasil foto dari satu sistem POSKART.
                </p>
                <div data-hero-copy className="mt-8 flex items-center gap-3">
                  <LandingButton
                    variant="primary"
                    size="lg"
                    asChild
                    className="h-12 flex-1 rounded-xl px-3 text-sm sm:h-14 sm:flex-none sm:rounded-2xl sm:px-8 sm:text-base"
                  >
                    <Link href="/register">
                      Coba gratis <ArrowRight className="size-4" />
                    </Link>
                  </LandingButton>
                  <LandingButton
                    variant="outlineLight"
                    size="lg"
                    asChild
                    className="h-12 flex-1 rounded-xl px-3 text-sm sm:h-14 sm:flex-none sm:rounded-2xl sm:px-8 sm:text-base"
                  >
                    <Link href="#workflow">
                      Lihat cara kerja <ArrowRight className="size-4" />
                    </Link>
                  </LandingButton>
                </div>
                <Link
                  href="#features"
                  data-hero-copy
                  className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white/80 transition-colors hover:text-white"
                >
                  Find Out More
                  <ArrowDown className="size-4 transition-transform duration-200 group-hover:translate-y-1" />
                </Link>
              </div>

              {/* Right: screenshot slot inside the grid (desktop) */}
              <div className="relative hidden lg:block">
                <div className="aspect-[10/7]" />
              </div>

              {/* Mobile visual */}
              <div ref={mobileVisualRef} className="relative lg:hidden">
                <Image
                  src={landingAssets.hero.src}
                  alt="Dashboard admin POSKART untuk mengelola operasional photobooth"
                  width={800}
                  height={500}
                  className="h-auto w-full rounded-[20px] border border-white/60 object-cover shadow-2xl"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Desktop screenshots: overlap the banner and may cross its right edge */}
          <div ref={desktopVisualRef} className="pointer-events-none absolute right-[-2%] top-1/2 hidden w-[52%] max-w-[44rem] -translate-y-1/2 lg:block">
            <div className="relative aspect-[10/7]">
              <div data-hero-layer className="absolute left-0 top-0 w-[84%] rotate-[-1.5deg]">
                <Image
                  src={landingAssets.hero.src}
                  alt="Dashboard admin POSKART untuk mengelola operasional photobooth"
                  width={640}
                  height={400}
                  className="h-auto w-full rounded-[22px] border border-white/70 object-cover shadow-[0_30px_60px_rgba(0,30,80,0.35)]"
                  priority
                />
              </div>
              <div data-hero-layer className="absolute bottom-0 right-0 w-[60%] rotate-[1.25deg]">
                <Image
                  src={landingAssets.boothApp.src}
                  alt="Aplikasi booth POSKART yang berjalan di tablet Android"
                  width={520}
                  height={380}
                  className="h-auto w-full rounded-[20px] border border-white/70 object-cover shadow-[0_26px_52px_rgba(0,30,80,0.38)]"
                />
              </div>
              <div data-hero-layer className="absolute -bottom-14 left-[10%] z-20 sm:-bottom-30 sm:left-[15%]">
                <ReceiptMockup />
              </div>
            </div>
          </div>
        </div>

        {/* Aggregate figures sit below the banner, not inside it. */}
        <dl
          ref={statsRef}
          className="mt-20 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-6 border-t border-zinc-200 px-6 pt-7 sm:mt-24 sm:grid-cols-4 sm:px-10 lg:mt-36 lg:px-16"
        >
          {heroStats.map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse">
              <dt className="mt-1.5 text-xs font-medium leading-4 text-zinc-500">
                {stat.label}
              </dt>
              <dd className="font-mono text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
