"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Check,
  CloudUpload,
  CreditCard,
  LayoutTemplate,
  MonitorSmartphone,
  Printer,
  WifiOff,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

const stories = [
  {
    number: "01",
    eyebrow: "Design",
    title: "Build every booth screen without touching app code.",
    description:
      "Arrange landing, payment, frame picker, camera, preview, and thank-you screens in a visual builder. Publish a complete experience to the right kiosk.",
    points: [
      "Drag-and-drop canvas",
      "Frame template builder",
      "Per-device publishing",
    ],
    image: "/iPad Pro 11.png",
    imageAlt: "POSKART visual builder shown on a tablet",
    icon: LayoutTemplate,
  },
  {
    number: "02",
    eyebrow: "Operate",
    title: "Keep the booth moving, even when the connection does not.",
    description:
      "Kiosk assets stay cached locally, sessions keep running offline, and pending media uploads retry when connectivity returns. Operators stay focused on guests.",
    points: [
      "Offline-ready assets",
      "QRIS and voucher modes",
      "Reliable print queue",
    ],
    image: "/POSKART Photobooth.png",
    imageAlt: "POSKART operations dashboard",
    icon: MonitorSmartphone,
  },
  {
    number: "03",
    eyebrow: "Deliver",
    title: "Turn every finished session into a trackable delivery.",
    description:
      "Upload framed and original photos, create a customer download link, and monitor the transaction, gallery, device, and payout trail from one dashboard.",
    points: [
      "Cloud gallery",
      "QR and email delivery",
      "Transaction visibility",
    ],
    image: "/iPhone 13 Pro.png",
    imageAlt: "POSKART mobile device dashboard",
    icon: CloudUpload,
  },
] as const;

export function ScrollyFeatures() {
  const rootRef = useRef<HTMLElement>(null);
  const storyRefs = useRef<(HTMLElement | null)[]>([]);
  const mediaRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeStory, setActiveStory] = useState(0);

  useLayoutEffect(() => {
    if (!rootRef.current) return;

    const context = gsap.context(() => {
      const media = mediaRefs.current.filter(Boolean);
      gsap.set(media, { autoAlpha: 0, y: 26, scale: 0.96 });
      gsap.set(media[0], { autoAlpha: 1, y: 0, scale: 1 });

      const matchMedia = gsap.matchMedia();

      matchMedia.add("(min-width: 1024px)", () => {
        storyRefs.current.forEach((story, index) => {
          if (!story) return;

          ScrollTrigger.create({
            trigger: story,
            start: "top 52%",
            end: "bottom 48%",
            onEnter: () => activate(index),
            onEnterBack: () => activate(index),
          });
        });
      });

      matchMedia.add("(max-width: 1023px)", () => {
        storyRefs.current.forEach((story) => {
          if (!story) return;
          gsap.fromTo(
            story,
            { opacity: 0, y: 36 },
            {
              opacity: 1,
              y: 0,
              duration: 0.7,
              ease: "power3.out",
              scrollTrigger: { trigger: story, start: "top 84%", once: true },
            },
          );
        });
      });

      function activate(index: number) {
        setActiveStory(index);
        mediaRefs.current.forEach((item, mediaIndex) => {
          if (!item) return;
          gsap.to(item, {
            autoAlpha: mediaIndex === index ? 1 : 0,
            y: mediaIndex === index ? 0 : 24,
            scale: mediaIndex === index ? 1 : 0.96,
            duration: 0.55,
            ease: "power3.out",
            overwrite: true,
          });
        });
      }

      return () => matchMedia.revert();
    }, rootRef);

    return () => context.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      id="platform"
      className="relative scroll-mt-[72px] bg-white text-zinc-950"
    >
      <div className="mx-auto max-w-[90rem] px-5 pb-20 pt-4 sm:px-8 lg:px-12 lg:pb-28 lg:pt-8">
        <div className="relative lg:grid lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
          <div className="lg:py-[18vh]">
            {stories.map((story, index) => {
              const Icon = story.icon;
              return (
                <article
                  key={story.number}
                  ref={(element) => {
                    storyRefs.current[index] = element;
                  }}
                  className="flex min-h-0 flex-col justify-center border-b border-zinc-300 py-16 lg:min-h-[82vh] lg:py-24"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-zinc-950">
                      {story.number} / {story.eyebrow}
                    </span>
                    <Icon className="size-5 text-zinc-400" />
                  </div>
                  <h3 className="mt-8 text-3xl font-bold leading-tight tracking-normal sm:text-4xl">
                    {story.title}
                  </h3>
                  <p className="mt-5 max-w-xl text-base leading-8 text-zinc-600">
                    {story.description}
                  </p>
                  <ul className="mt-8 space-y-3">
                    {story.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-center gap-3 text-sm font-medium"
                      >
                        <span className="grid size-6 place-items-center rounded-full bg-zinc-950 text-white">
                          <Check className="size-3.5" />
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-10 lg:hidden">
                    <StoryVisual storyIndex={index} />
                  </div>
                </article>
              );
            })}
          </div>

          <div className="sticky top-24 hidden h-[calc(100vh-7rem)] items-center self-start lg:flex">
            <div className="relative h-[70vh] rounded-4xl w-full overflow-hidden border border-white/70 bg-zinc-900 shadow-[0_24px_70px_rgba(24,24,27,0.16)]">
              <div className="absolute inset-x-5 top-5 z-10 flex items-center justify-between gap-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-300 xl:inset-x-7 xl:top-7 xl:text-xs">
                <span className="min-w-0 truncate">POSKART system</span>
                <span>{String(activeStory + 1).padStart(2, "0")} / 03</span>
              </div>

              {stories.map((story, index) => (
                <div
                  key={story.number}
                  ref={(element) => {
                    mediaRefs.current[index] = element;
                  }}
                  className="absolute inset-0 flex items-center justify-center p-10 pt-20"
                  style={{
                    opacity: index === 0 ? 1 : 0,
                    visibility: index === 0 ? "visible" : "hidden",
                  }}
                >
                  <Image
                    src={story.image}
                    alt={story.imageAlt}
                    width={1600}
                    height={1100}
                    className={cn(
                      "h-full w-full object-contain drop-shadow-[0_30px_28px_rgba(0,0,0,0.28)]",
                      index === 2 && "max-h-[88%]",
                    )}
                  />
                </div>
              ))}

              <div className="absolute inset-x-7 bottom-7 z-10 flex gap-2">
                {stories.map((story, index) => (
                  <span
                    key={story.number}
                    className={cn(
                      "h-1 flex-1 transition-colors duration-300",
                      index === activeStory ? "bg-white" : "bg-white/20",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-y border-zinc-300 bg-white">
        <div className="mx-auto grid max-w-[90rem] divide-y divide-zinc-200 px-5 sm:px-8 md:grid-cols-4 md:divide-x md:divide-y-0 lg:px-12">
          {[
            { icon: WifiOff, label: "Offline-ready kiosk" },
            { icon: CreditCard, label: "QRIS and vouchers" },
            { icon: Printer, label: "Protected print flow" },
            { icon: CloudUpload, label: "Cloud delivery" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 py-5 md:px-5">
              <Icon className="size-4 text-zinc-950" />
              <span className="text-sm font-semibold">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StoryVisual({ storyIndex }: { storyIndex: number }) {
  const story = stories[storyIndex];
  return (
    <div className="relative aspect-[4/3] overflow-hidden border border-white/70 bg-zinc-900 p-6 shadow-[0_20px_50px_rgba(24,24,27,0.12)]">
      <Image
        src={story.image}
        alt={story.imageAlt}
        width={1200}
        height={900}
        className="h-full w-full object-contain drop-shadow-[0_20px_20px_rgba(0,0,0,0.25)]"
      />
    </div>
  );
}
