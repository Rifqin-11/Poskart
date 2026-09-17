"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import { landingAssets } from "@/features/root/home/landing-content";

gsap.registerPlugin(ScrollTrigger);

const stories = [
  {
    number: "01",
    label: "Atur pengalaman booth",
    title: "Brand Anda, sampai ke layar booth.",
    description:
      "Atur theme, frame, dan tampilan booth melalui Visual Builder tanpa mengubah kode.",
    points: ["Theme dan frame", "Tampilan setiap layar", "Publish dari Admin Web"],
    imageSrc: landingAssets.builder.src,
    imageAlt: "Visual Builder POSKART mengatur frame dan tema booth",
  },
  {
    number: "02",
    label: "Jalankan sesi",
    title: "Dari antrean sampai hasil tercetak.",
    description:
      "Kelola pembayaran, capture, preview, retake, dan print dalam satu alur aplikasi booth.",
    points: ["QRIS dan voucher", "Preview dan retake", "Thermal printing"],
    imageSrc: landingAssets.operations.src,
    imageAlt: "Aplikasi booth POSKART menjalankan antrean sesi foto",
  },
  {
    number: "03",
    label: "Pantau operasional",
    title: "Ketahui booth mana yang membutuhkan perhatian.",
    description:
      "Pantau aplikasi, device, printer, dan sinkronisasi tanpa harus memeriksa setiap tablet.",
    points: ["Status aplikasi", "Device dan printer", "Sinkronisasi konfigurasi"],
    imageSrc: "/landing/devices.webp",
    imageAlt: "Monitoring dashboard POSKART untuk multi-booth",
  },
] as const;

export function ProductFeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const storyRefs = useRef<(HTMLElement | null)[]>([]);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useLayoutEffect(() => {
    if (!sectionRef.current) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    if (reduced || !desktop) return;

    const duration = 0.48;

    const context = gsap.context(() => {
      const storyElements = storyRefs.current.filter(Boolean) as HTMLElement[];
      const imageElements = imageRefs.current.filter(Boolean) as HTMLDivElement[];
      const dotElements = dotRefs.current.filter(Boolean) as HTMLSpanElement[];

      gsap.set(imageElements, { autoAlpha: 0, scale: 0.975 });
      gsap.set(imageElements[0], { autoAlpha: 1, scale: 1 });
      gsap.set(storyElements, { opacity: 0.38 });
      gsap.set(storyElements[0], { opacity: 1 });
      gsap.set(dotElements, { scaleX: 0.35, backgroundColor: "#d4d4d8" });
      gsap.set(dotElements[0], { scaleX: 1, backgroundColor: "#014EB4" });

      let activeIndex = 0;

      const activate = (index: number) => {
        if (index === activeIndex) return;
        activeIndex = index;

        gsap.to(imageElements, {
          autoAlpha: 0,
          scale: 0.975,
          duration: duration * 0.65,
          ease: "power2.inOut",
          overwrite: true,
        });
        gsap.to(imageElements[index], {
          autoAlpha: 1,
          scale: 1,
          duration,
          delay: 0.08,
          ease: "power3.out",
          overwrite: true,
        });
        gsap.to(storyElements, {
          opacity: 0.38,
          duration: duration * 0.7,
          overwrite: true,
        });
        gsap.to(storyElements[index], {
          opacity: 1,
          duration,
          overwrite: true,
        });
        gsap.to(dotElements, {
          scaleX: 0.35,
          backgroundColor: "#d4d4d8",
          duration: duration * 0.7,
          overwrite: true,
        });
        gsap.to(dotElements[index], {
          scaleX: 1,
          backgroundColor: "#014EB4",
          duration,
          overwrite: true,
        });
      };

      storyElements.forEach((story, index) => {
        ScrollTrigger.create({
          trigger: story,
          start: "top center",
          end: "bottom center",
          onEnter: () => activate(index),
          onEnterBack: () => activate(index),
        });
      });
    }, sectionRef);

    return () => context.revert();
  }, []);

  return (
    <section ref={sectionRef} className="bg-white py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <div className="max-w-3xl">
          <h2 className="text-4xl font-black leading-[0.98] tracking-tight text-zinc-900 sm:text-5xl">
            Dari booth dinyalakan sampai foto diterima.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-7 text-zinc-600">
            Tiga tahap yang menghubungkan Admin Web, aplikasi booth, dan operasional di lokasi.
          </p>
        </div>

        <div className="relative mt-10 lg:grid lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
          {/* Story triggers */}
          <div>
            {stories.map((story, index) => (
              <article
                key={story.number}
                ref={(element) => {
                  storyRefs.current[index] = element;
                }}
                className="flex flex-col justify-center border-b border-zinc-200 py-14 transition-opacity sm:py-16 lg:min-h-[72vh] lg:py-20"
              >
                <div className="flex items-center gap-3 font-mono text-xs font-semibold text-[#014EB4]">
                  <span>{story.number}</span>
                  <span className="text-zinc-300">/</span>
                  <span>{story.label}</span>
                </div>
                <h3 className="mt-6 text-3xl font-black leading-tight tracking-tight text-zinc-900 sm:text-4xl">
                  {story.title}
                </h3>
                <p className="mt-5 max-w-xl text-base leading-7 text-zinc-600 sm:text-lg">
                  {story.description}
                </p>
                <ul className="mt-7 space-y-2.5 text-sm text-zinc-600">
                  {story.points.map((point) => (
                    <li key={point} className="flex items-center gap-3">
                      <span className="size-1.5 rounded-full bg-[#014EB4]" />
                      {point}
                    </li>
                  ))}
                </ul>

                {/* Each story keeps its own image on mobile. */}
                <div className="mt-9 overflow-hidden rounded-2xl border border-zinc-200 bg-[#F7F8FA] p-2 lg:hidden motion-reduce:lg:block">
                  <Image
                    src={story.imageSrc}
                    alt={story.imageAlt}
                    width={1600}
                    height={1000}
                    sizes="(max-width: 1023px) 92vw, 1px"
                    className="h-auto w-full rounded-xl object-contain"
                  />
                </div>
              </article>
            ))}
          </div>

          {/* Sticky visual */}
          <div className="sticky top-24 hidden h-[calc(100dvh-7rem)] items-center self-start lg:flex motion-reduce:lg:hidden">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[28px] border border-zinc-200 bg-[#F1F4F8] shadow-[0_24px_60px_rgba(0,53,123,0.12)]">
              {stories.map((story, index) => (
                <div
                  key={story.number}
                  ref={(element) => {
                    imageRefs.current[index] = element;
                  }}
                  className={cn(
                    "invisible absolute inset-0 flex items-center justify-center p-5 opacity-0",
                    index === 0 && "visible opacity-100",
                  )}
                >
                  <Image
                    src={story.imageSrc}
                    alt={story.imageAlt}
                    width={1600}
                    height={1000}
                    sizes="(min-width: 1024px) 55vw, 1px"
                    className="h-full w-full object-contain"
                    priority={index === 0}
                  />
                </div>
              ))}

              <div className="absolute inset-x-6 bottom-6 z-10 flex gap-2">
                {stories.map((story, index) => (
                  <span
                    key={story.number}
                    ref={(element) => {
                      dotRefs.current[index] = element;
                    }}
                    className="h-1 flex-1 origin-left bg-zinc-300"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
