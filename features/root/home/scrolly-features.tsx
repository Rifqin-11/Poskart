"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Check,
  CreditCard,
  LayoutTemplate,
  MonitorSmartphone,
  MonitorCheck,
  Printer,
  ListOrdered,
  Share2,
  WifiOff,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import { landingContent } from "@/features/root/home/landing-content";
import { useNearViewport } from "@/features/root/home/use-near-viewport";

gsap.registerPlugin(ScrollTrigger);

const storyIcons = [LayoutTemplate, MonitorSmartphone, MonitorCheck, Share2] as const;

const stories = landingContent.stories.map((story, index) => ({
  ...story,
  image: story.asset.src,
  imageAlt: story.asset.alt,
  icon: storyIcons[index],
}));

const sceneEntrances = [
  { x: 34, y: 0, scale: 0.96, rotate: -1.2 },
  { x: 0, y: 28, scale: 1.02, rotate: 0 },
  { x: -30, y: 0, scale: 0.965, rotate: 1.1 },
  { x: 0, y: -24, scale: 0.94, rotate: 0 },
] as const;

export function ScrollyFeatures() {
  const rootRef = useRef<HTMLElement>(null);
  const storyRefs = useRef<(HTMLElement | null)[]>([]);
  const mediaRefs = useRef<(HTMLDivElement | null)[]>([]);
  const previousStoryRef = useRef(0);
  const [activeStory, setActiveStory] = useState(0);

  // Scrollytelling sits below the fold. Its GSAP timelines and ScrollTrigger
  // geometry reads are deferred until the section is nearly in view so they
  // never run during the hero's LCP window.
  const nearViewport = useNearViewport(rootRef);

  useLayoutEffect(() => {
    if (!nearViewport) return;
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
        if (index === previousStoryRef.current) return;

        const previous = mediaRefs.current[previousStoryRef.current];
        const next = mediaRefs.current[index];
        const entrance = sceneEntrances[index];

        setActiveStory(index);

        const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
        if (previous) {
          timeline.to(previous, {
            autoAlpha: 0,
            y: index > previousStoryRef.current ? -20 : 20,
            scale: 0.975,
            duration: 0.32,
            overwrite: true,
          }, 0);
        }
        if (next) {
          timeline.fromTo(
            next,
            {
              autoAlpha: 0,
              x: entrance.x,
              y: entrance.y,
              scale: entrance.scale,
              rotate: entrance.rotate,
              clipPath: index === 1
                ? "inset(0 0 100% 0 round 28px)"
                : index === 3
                  ? "inset(12% 12% 12% 12% round 28px)"
                  : "inset(0% 0% 0% 0% round 28px)",
            },
            {
              autoAlpha: 1,
              x: 0,
              y: 0,
              scale: 1,
              rotate: 0,
              clipPath: "inset(0% 0% 0% 0% round 28px)",
              duration: 0.72,
              overwrite: true,
            },
            0.08,
          );
        }

        previousStoryRef.current = index;
      }

      return () => matchMedia.revert();
    }, rootRef);

    return () => context.revert();
  }, [nearViewport]);

  return (
    <section
      ref={rootRef}
      id="features"
      className="relative scroll-mt-[72px] bg-white text-zinc-950"
    >
      <div className="mx-auto max-w-[90rem] px-5 pb-20 pt-4 sm:px-8 lg:px-12 lg:pb-28 lg:pt-8">
        <div className="border-b border-blue-100 pb-10 pt-12 lg:pb-14">
          <p className="max-w-3xl text-3xl font-black leading-[1.02] tracking-[-0.04em] sm:text-5xl">
            Dari booth dinyalakan sampai foto diterima.
          </p>
          <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600">
            Empat tahap yang menghubungkan aplikasi booth, perangkat, dan Admin Web.
          </p>
          <nav aria-label="Tahap alur aplikasi booth" className="mt-8 grid grid-cols-4 gap-2">
            {stories.map((story, index) => (
              <button
                key={story.number}
                type="button"
                aria-current={activeStory === index ? "step" : undefined}
                onClick={() => storyRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "center" })}
                className="group text-left"
              >
                <span className={cn(
                  "block h-1 origin-left transition-[background-color,transform] duration-500",
                  activeStory === index ? "scale-x-100 bg-[#00357B]" : "scale-x-[0.45] bg-blue-100 group-hover:scale-x-75",
                )} />
                <span className={cn(
                  "mt-2 hidden text-xs font-semibold transition-colors sm:block",
                  activeStory === index ? "text-[#00357B]" : "text-zinc-400",
                )}>
                  {story.number} {story.eyebrow}
                </span>
              </button>
            ))}
          </nav>
        </div>

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
                  className={cn(
                    "flex min-h-0 flex-col justify-center border-b border-blue-100 py-16 transition-opacity duration-500 lg:min-h-[70vh] lg:py-20",
                    activeStory === index ? "opacity-100" : "lg:opacity-40",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#00357B]">
                      {story.number} / {story.eyebrow}
                    </span>
                    <Icon className="size-5 text-[#C9364A]" />
                  </div>
                  <h3 className="mt-7 text-3xl font-bold leading-tight tracking-[-0.025em] sm:text-4xl">
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
                        <span className="grid size-6 place-items-center rounded-full bg-[#00357B] text-white">
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
            <div className="relative h-[70vh] w-full overflow-hidden rounded-[28px] border border-blue-200/70 bg-[linear-gradient(145deg,#00357B_0%,#014EB4_58%,#082952_100%)] shadow-[0_24px_70px_rgba(0,53,123,0.2)]">
              <div className="absolute inset-x-5 top-5 z-10 flex items-center justify-between gap-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-300 xl:inset-x-7 xl:top-7 xl:text-xs">
                <span className="min-w-0 truncate">Alur aplikasi booth</span>
                <span>{String(activeStory + 1).padStart(2, "0")} / {String(stories.length).padStart(2, "0")}</span>
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

      <div className="border-y border-blue-100 bg-[#f8faff]">
        <div className="mx-auto grid max-w-[90rem] divide-y divide-blue-100 px-5 sm:px-8 md:grid-cols-4 md:divide-x md:divide-y-0 lg:px-12">
          {[
            { icon: CreditCard, label: "QRIS dan cash" },
            { icon: ListOrdered, label: "Antrean pengunjung" },
            { icon: Printer, label: "Print flow terpantau" },
            { icon: WifiOff, label: "Booth tetap siap berjalan" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 py-5 md:px-5">
              <Icon className="size-4 text-[#00357B]" />
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
    <div className="relative aspect-[4/3] overflow-hidden border border-blue-100 bg-[linear-gradient(145deg,#00357B_0%,#014EB4_60%,#082952_100%)] p-6 shadow-[0_20px_50px_rgba(0,53,123,0.16)]">
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
