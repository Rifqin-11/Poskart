"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Download,
  Sparkles,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { LatestAppRelease } from "@/features/root/home/api";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.65,
      ease: [0.25, 0.4, 0.25, 1] as const,
    },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.8, ease: [0.25, 0.4, 0.25, 1] as const, delay: 0.1 },
  },
};

export function HeroSection({
  latestRelease,
}: {
  latestRelease: LatestAppRelease | null;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);

  // Track scroll position of the hero section relative to viewport
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Parallax and 3D tilt transformation maps for mockup image
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.88]);
  const rotateX = useTransform(scrollYProgress, [0, 1], [0, 10]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -30]);

  // Parallax and fade mapping for the headline/CTA text
  const textY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative isolate overflow-hidden bg-white"
      style={{ perspective: 1200 }}
    >
      <div className="mx-auto max-w-[90rem] px-4 pb-12 pt-10 sm:px-6 lg:px-8 lg:pb-16 lg:pt-14">
        {/* ── IMAGE FIRST (top) — with modern scroll 3D tilt and scale ── */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={scaleIn}
          style={{
            scale,
            rotateX,
            y,
            transformStyle: "preserve-3d",
          }}
          className="relative mx-auto max-w-5xl origin-top transition-all duration-100 ease-out"
        >
          <Image
            src="/Poskart hero.png"
            alt="POSKART multi-device overview — Dashboard, Visual Builder, and Mobile App"
            width={1920}
            height={1080}
            priority
            className="mx-auto h-auto w-full max-w-4xl object-contain"
          />
        </motion.div>

        {/* ── TEXT BELOW — with parallax slide and opacity fade ── */}
        <motion.div
          style={{ y: textY, opacity: textOpacity }}
          className="relative mx-auto max-w-4xl text-center"
        >
          {/* Badge */}
          <motion.div
            initial="hidden"
            animate="visible"
            custom={0}
            variants={fadeUp}
            className="flex justify-center"
          >
            <div className="inline-flex items-center gap-2.5 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-600 shadow-sm">
              <Sparkles className="size-3.5 text-orange-500" />
              <span>Photobooth OS untuk Android</span>
              <span className="h-3 w-px bg-zinc-200" />
              <span className="font-semibold text-orange-600">
                {latestRelease ? `${latestRelease.version}` : "Latest"}
              </span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial="hidden"
            animate="visible"
            custom={1}
            variants={fadeUp}
            className="mt-6 text-balance text-3xl font-bold tracking-[-0.04em] text-zinc-950 sm:text-4xl lg:text-[3.5rem] lg:leading-[1.1]"
          >
            Kelola photobooth,{" "}
            <span className="text-gradient-warm">
              dari kamera sampai cetak.
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial="hidden"
            animate="visible"
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-5 max-w-2xl text-base leading-7 text-zinc-500 sm:text-lg sm:leading-8"
          >
            Satu platform untuk menjalankan booth, mengatur tampilan, menerima
            pembayaran QRIS, mencetak foto, dan memantau seluruh perangkat.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial="hidden"
            animate="visible"
            custom={3}
            variants={fadeUp}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <a
              href="/download/app"
              className={buttonVariants({
                size: "lg",
                className:
                  "group relative h-12 overflow-hidden rounded-full bg-zinc-950 px-7 text-sm font-semibold text-white shadow-lg shadow-zinc-950/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-xl active:translate-y-0",
              })}
            >
              <Download className="size-4" />
              Download {latestRelease?.version ?? "App"}
            </a>
            <Link
              href="/subscriptions"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className:
                  "h-12 rounded-full border-zinc-200 bg-white px-7 text-sm font-semibold text-zinc-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md active:translate-y-0",
              })}
            >
              Lihat Harga
              <ArrowRight className="size-4" />
            </Link>
          </motion.div>

          <motion.p
            initial="hidden"
            animate="visible"
            custom={4}
            variants={fadeUp}
            className="mt-3 text-xs text-zinc-400"
          >
            APK Android dari GitHub release
            {latestRelease
              ? ` · ${Math.round(latestRelease.fileSize / 1024 / 1024)} MB`
              : ""}
          </motion.p>

          {/* Scroll indicator */}
          <motion.div
            initial="hidden"
            animate="visible"
            custom={5}
            variants={fadeUp}
            className="mt-10"
          >
            <a
              href="#platform"
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-700"
            >
              Lihat alur photobooth
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
