"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HeroRetroScene } from "./hero-retro-scene";
import styles from "./hero-retro.module.css";
import { LandingButton } from "@/components/ui/landing-button";

gsap.registerPlugin(ScrollTrigger);

export function HeroSection() {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const media = gsap.matchMedia();
    media.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const timeline = gsap.timeline({ scrollTrigger: {
        trigger: ref.current, start: "top top", end: "+=90%", pin: true,
        scrub: 0.25, invalidateOnRefresh: true,
      } });
      [2, 3, 4].forEach((pose, index) => {
        const at = index * .25;
        timeline.to("[data-retro-flash]", { opacity: .85, duration: .025 }, at)
          .set(`[data-retro-pose="${pose}"]`, { opacity: 1 }, at + .025)
          .to("[data-retro-flash]", { opacity: 0, duration: .045 }, at + .025);
      });
      timeline.fromTo("[data-retro-led]", { opacity: 0 }, { opacity: 1, duration: .05 }, 0)
        .fromTo("[data-retro-paper]", { yPercent: -100 }, { yPercent: 0, duration: .8, ease: "none" }, 0)
        .to("[data-retro-paper]", { rotation: -3, y: 10, scale: 1.04, duration: .1 }, .8)
        .to("[data-retro-led]", { opacity: 0, duration: .1 }, .8)
        .to("[data-retro-hint]", { opacity: 0, duration: .15 }, 0);
    }, ref);
    media.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)", () => {
      const timeline = gsap.timeline({ scrollTrigger: { trigger: "[data-retro-tv]", start: "top 75%", once: true } });
      [2, 3, 4].forEach((pose, index) => {
        const at = 1.2 + index * 1.1;
        timeline.to("[data-retro-flash]", { opacity: .85, duration: .09 }, at)
          .set(`[data-retro-pose="${pose}"]`, { opacity: 1 }, at + .09)
          .to("[data-retro-flash]", { opacity: 0, duration: .15 }, at + .09);
      });
      timeline.fromTo("[data-retro-led]", { opacity: 0 }, { opacity: 1, duration: .1 }, 1.2)
        .fromTo("[data-retro-paper]", { yPercent: -100 }, { yPercent: 0, duration: 2.5, ease: "none" }, 1.2)
        .to("[data-retro-led]", { opacity: 0, duration: .15 }, 3.7);
    }, ref);
    return () => media.revert();
  }, []);

  return (
    <>
    <section ref={ref} className={styles.hero} aria-labelledby="retro-hero-title">
      <div className={styles.layout}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}><span /> POSKART / RECEIPT PHOTOBOOTH</p>
          <h1 id="retro-hero-title">Momen kecil.<br />Kenangan yang<br /><em>bisa dipegang.</em></h1>
          <p className={styles.description}>Receipt Photobooth App untuk bisnis Anda. Dari senyum di depan kamera sampai struk foto di tangan, semuanya dalam satu platform.</p>
          <div className={styles.actions}>
            <LandingButton variant="primary" size="md" asChild><Link href="/register">Coba gratis <ArrowUpRight size={18} /></Link></LandingButton>
            <Link href="#workflow" className={styles.secondary}>Lihat cara kerja <span>↗</span></Link>
          </div>
          <div className={styles.note}>Untuk coffee shop, event, dan ruang kreatif Anda.</div>
          <p data-retro-hint className={styles.hint}><ArrowDown size={16} /> Scroll untuk mencetak kenangan</p>
        </div>
        <HeroRetroScene />
      </div>
    </section>
    <div className={styles.statsSection}>
      <dl className={styles.stats}>
        {[["1000+", "prints"], ["700+", "sessions"], ["99%", "QRIS berhasil"], ["97%", "session berhasil"]].map(([value, label]) => (
          <div key={label}><dt>{value}</dt><dd>{label}</dd></div>
        ))}
      </dl>
    </div>
    </>
  );
}
