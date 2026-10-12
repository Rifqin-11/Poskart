"use client";
/* eslint-disable @next/next/no-img-element -- Layered pouch crops and proxied session images use native image elements. */

import { createContext, useContext, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import gsap from "gsap";
import { ArrowLeft, ArrowRight, PackageOpen, CheckCircle2, RotateCcw } from "lucide-react";
import styles from "./gallery-unboxing.module.css";

const UnboxingContext = createContext<{ enabled: boolean; replay: () => void } | null>(null);

export function GalleryUnboxingReplay() {
  const unboxing = useContext(UnboxingContext);
  if (!unboxing?.enabled) return null;
  return <div className={styles.replayBar}><button data-gallery-button onClick={unboxing.replay}><RotateCcw size={15} /> Ulang unboxing</button></div>;
}

export function GalleryUnboxing({ children, sessionId, photoUrl, brandName, logoUrl, subtitle, enabled, loading = false, autoOpen = true }: {
  children: ReactNode; sessionId: string; photoUrl?: string; brandName: string; logoUrl: string; subtitle: string; enabled: boolean; loading?: boolean; autoOpen?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [opening, setOpening] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const overlay = useRef<HTMLDivElement>(null);
  const pouch = useRef<HTMLDivElement>(null);
  const seal = useRef<HTMLDivElement>(null);
  const tear = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const intact = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const skip = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ id: number; start: number; width: number } | null>(null);
  const progress = useRef(0);
  const busy = useRef(false);
  const animation = useRef<gsap.core.Timeline | null>(null);
  const key = `poskart:unboxed:${sessionId}`;

  useEffect(() => {
    if (!enabled || !autoOpen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try { if (!loading && sessionStorage.getItem(key)) return; } catch { /* Storage is optional. */ }
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => { cancelAnimationFrame(frame); animation.current?.kill(); };
  }, [enabled, loading, autoOpen, key]);

  useEffect(() => {
    if (!visible) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.dataset.galleryUnboxing = "active";
    skip.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = overflow;
      delete document.documentElement.dataset.galleryUnboxing;
      if (previous && previous !== document.body) previous.focus({ preventScroll: true });
    };
  }, [visible]);

  function finish() {
    animation.current?.kill();
    try { sessionStorage.setItem(key, "1"); } catch { /* Continue without persistence. */ }
    setVisible(false);
    requestAnimationFrame(() => content.current?.focus({ preventScroll: true }));
  }

  function paint(value: number) {
    progress.current = value;
    // Keep the pouch completely still while swiping. The only feedback is the
    // rip spreading from the right notch; the layers separate after release.
    if (tear.current) tear.current.style.clipPath = `inset(0 0 0 ${(1 - value) * 100}%)`;
  }

  function open() {
    if (busy.current || loading) return;
    busy.current = true;
    drag.current = null;
    setOpening(true);
    const driver = { value: progress.current };
    animation.current?.kill();
    if (photo.current) photo.current.style.opacity = "1";
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      paint(1);
      gsap.set([intact.current, body.current, seal.current, tear.current], { opacity: 0 });
      gsap.set(photo.current, { opacity: 1, scale: 1.22, yPercent: -8 });
      setRevealed(true);
      return;
    }
    animation.current = gsap.timeline({ onComplete: () => {
      try { sessionStorage.setItem(key, "1"); } catch { /* Continue without persistence. */ }
      setRevealed(true);
    } })
      .to(driver, { value: 1, duration: .25, onUpdate: () => paint(driver.value), ease: "power2.out" })
      // Swap the intact pouch for the split layers; the torn edges now show.
      .set([intact.current, tear.current], { opacity: 0 }, .25)
      .to(body.current, { y: () => (pouch.current?.offsetHeight ?? 450) * 1.05, duration: .85, ease: "power2.inOut" }, .4)
      .to(photo.current, { yPercent: -8, scale: 1.22, rotation: -2, duration: .7, ease: "power3.out" }, 1.0)
      .to(seal.current, { y: () => -(pouch.current?.offsetHeight ?? 450) * .34, rotation: -2, opacity: 0, duration: .7, ease: "power3.inOut" }, 1.0)
      .to(body.current, { opacity: 0, duration: .25 }, 1.25);
  }

  function enterGallery() {
    animation.current?.kill();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { finish(); return; }
    animation.current = gsap.timeline({ onComplete: finish })
      .to(photo.current, { scale: 1.28, opacity: 0, duration: .3, ease: "power2.in" })
      .to(overlay.current, { opacity: 0, duration: .35 }, .12);
  }

  function replay() {
    if (loading) return;
    animation.current?.kill();
    progress.current = 0;
    busy.current = false;
    drag.current = null;
    setOpening(false);
    setRevealed(false);
    setVisible(true);
  }

  function release(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!cancelled && progress.current >= .9) { open(); return; }
    const driver = { value: progress.current };
    animation.current = gsap.timeline().to(driver, { value: 0, duration: .3, ease: "power2.out", onUpdate: () => paint(driver.value) });
  }

  return <UnboxingContext.Provider value={{ enabled, replay }}>
    <div ref={content} tabIndex={-1} inert={visible} aria-hidden={visible || undefined}>
      {children}
    </div>
    {visible && <div ref={overlay} data-revealed={revealed} data-loading={loading} className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="unboxing-title"
      onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); finish(); }
        if (event.key === "Tab") {
          const buttons = Array.from(overlay.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
          const first = buttons[0], last = buttons[buttons.length - 1];
          if (!buttons.length) { event.preventDefault(); return; }
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      }}>
      <div className={styles.header}>
        <div className={styles.brand}><img src={logoUrl} alt={`${brandName} logo`} /><div><strong>{brandName}</strong><span>{subtitle}</span></div></div>
         {!loading && <button ref={skip} onClick={revealed ? enterGallery : finish}>{revealed ? "Lihat semua foto" : "Langsung lihat foto"} <ArrowRight size={16} /></button>}
       </div>
        <div className={styles.intro}><h1 id="unboxing-title">{loading ? "Foto Anda sedang disiapkan." : revealed ? "Foto Anda sudah siap." : "Foto Anda sudah siap."}</h1><p>{loading ? "Foto sedang diunggah. Paket akan bisa dibuka setelah selesai." : revealed ? "Lihat dan unduh semua foto dari sesi Anda." : "Tarik seal dari kanan ke kiri untuk membuka paket."}</p></div>
      <div ref={pouch} className={styles.pouch}>
        <div ref={photo} className={styles.photo}>{photoUrl && <img src={photoUrl} alt="Foto hasil sesi Anda" onError={finish} />}</div>
        <div ref={body} className={styles.body}><img src="/landing/gallery-pouch-navy-body.webp" alt="" draggable={false} onError={finish} /></div>
        <div ref={seal} className={styles.seal}><img src="/landing/gallery-pouch-navy-top.webp" alt="" draggable={false} onError={finish} /></div>
        <div ref={intact} className={styles.intact}><img src="/landing/gallery-pouch-navy.webp" alt="Paket foto POSKART biru tua yang masih tersegel" draggable={false} onError={finish} /></div>
        <div ref={tear} className={styles.tear} aria-hidden="true"><img src="/landing/gallery-pouch-navy-tear.webp" alt="" draggable={false} /></div>
         <button className={styles.handle} aria-label="Tarik ke kiri untuk merobek seal, atau tekan untuk membuka paket" disabled={opening || loading}
          onClick={event => { if (event.detail === 0) open(); }}
          onPointerDown={event => {
            if (busy.current || !event.isPrimary || event.button !== 0) return;
            animation.current?.kill();
            drag.current = { id: event.pointerId, start: event.clientX, width: pouch.current?.getBoundingClientRect().width ?? 300 };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={event => {
            if (drag.current?.id !== event.pointerId || busy.current) return;
            paint(Math.max(0, Math.min(1, (drag.current.start - event.clientX) / (drag.current.width * .8))));
          }}
          onPointerUp={event => release(event)} onPointerCancel={event => release(event, true)}>
          <span className={styles.tearGuide} aria-hidden="true"><ArrowLeft size={22} strokeWidth={2.5} /></span><span className={styles.notch}><ArrowLeft size={22} strokeWidth={2.5} aria-hidden="true" /></span>
        </button>
      </div>
       <div className={styles.actions}>
          {loading ? <><p className={styles.loadingState} aria-live="polite"><span /> Foto sedang diunggah…</p><small>Halaman ini akan memperbarui otomatis saat foto siap.</small></> : revealed ? <><p className={styles.success}><CheckCircle2 size={14} /> Foto Anda sudah siap</p><button data-gallery-button className={styles.viewAll} onClick={enterGallery}>Lihat semua foto <ArrowRight size={17} /></button><small>Foto original, Live Photo, dan pilihan download ada di dalam.</small></> : <><p aria-live="polite">{opening ? "Membuka paket foto…" : "Atau buka dengan satu ketukan."}</p><button onClick={open} disabled={opening}><PackageOpen size={17} /> Buka paket</button></>}
      </div>
    </div>}
  </UnboxingContext.Provider>;
}
