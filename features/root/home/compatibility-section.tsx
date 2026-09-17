"use client";

import { useRef, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useNearViewport } from "./use-near-viewport";
import { ArrowRight, WifiOff, Printer, Smartphone, Camera } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: Smartphone,
    title: "Android 10+ recommended",
    description: "Minimum teknis Android 7 pada perangkat ARM64.",
  },
  {
    icon: Camera,
    title: "Kamera bawaan tablet",
    description: "Front dan rear camera yang tersedia melalui Android CameraX.",
  },
  {
    icon: Printer,
    title: "Direct USB ESC/POS",
    description: "Printer thermal 58 mm atau 80 mm melalui USB Host/OTG.",
  },
  {
    icon: WifiOff,
    title: "Offline capable",
    description: "Foto, print, voucher tetap berjalan tanpa internet.",
  },
] as const;

export function CompatibilitySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const nearViewport = useNearViewport(sectionRef);

  useLayoutEffect(() => {
    if (!nearViewport) return;
    if (!sectionRef.current) return;
    const context = gsap.context(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      gsap.from("[data-compat-heading]", {
        autoAlpha: 0,
        y: 32,
        duration: 0.7,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 72%", once: true },
      });

      cardRefs.current.forEach((card, index) => {
        if (!card) return;
        gsap.from(card, {
          autoAlpha: 0,
          y: index % 2 === 0 ? -44 : 44,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: { trigger: card, start: "top 82%", once: true },
        });
      });
    }, sectionRef);
    return () => context.revert();
  }, [nearViewport]);

  return (
    <section ref={sectionRef} id="compatibility" className="scroll-mt-[72px] overflow-hidden bg-white">
      <div className="mx-auto max-w-[90rem] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div data-compat-heading className="mb-16 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Spesifikasi Perangkat
          </p>
          <h2 className="mt-4 text-4xl font-black leading-[0.96] tracking-[-0.04em] text-zinc-950 sm:text-6xl">
            Kompatibilitas Receipt Photobooth App
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
            POSKART dirancang untuk tablet Android landscape dengan kamera bawaan dan printer thermal yang terhubung langsung di lokasi.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description }, index) => (
            <div
              key={title}
              ref={(element) => { cardRefs.current[index] = element; }}
              className="border border-blue-100 rounded-2xl p-6"
            >
              <div className="mb-4 grid size-12 place-items-center rounded-xl bg-blue-50">
                <Icon className="size-5 text-[#00357B]" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-zinc-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
            </div>
          ))}
        </div>

        {/* Technical specifications */}
        <div className="mt-14 border-t border-blue-100 pt-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-3">
                Sistem Operasi
              </p>
              <p className="text-base font-bold text-zinc-900">Android 10+</p>
              <p className="mt-2 text-sm text-zinc-600">Minimum Android 7 (API 24) pada perangkat ARM64</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-3">
                Layar
              </p>
              <p className="text-base font-bold text-zinc-900">Tablet 10 inci+</p>
              <p className="mt-2 text-sm text-zinc-600">Minimum 1280×800, landscape direkomendasikan</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-3">
                Kamera
              </p>
              <p className="text-base font-bold text-zinc-900">Front & Rear</p>
              <p className="mt-2 text-sm text-zinc-600">Kamera bawaan tablet melalui Android CameraX</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-3">
                Printer Thermal
              </p>
              <p className="text-base font-bold text-zinc-900">USB ESC/POS</p>
              <p className="mt-2 text-sm text-zinc-600">58 mm atau 80 mm, partial-cut supported</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-14 flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-zinc-900">Perangkat Anda belum ada dalam daftar?</p>
            <p className="mt-2 text-sm text-zinc-600">Tim kami siap membantu memeriksa kompatibilitas sebelum Anda mendaftar.</p>
          </div>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#00357B] hover:text-[#014EB4] transition-colors"
          >
            Cek kompatibilitas perangkat <ArrowRight className="size-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
