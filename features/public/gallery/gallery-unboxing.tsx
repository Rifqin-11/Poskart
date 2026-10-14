"use client";
/* eslint-disable @next/next/no-img-element -- Layered pouch crops and proxied session images use native image elements. */

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import gsap from "gsap";
import { ArrowLeft, ArrowRight, PackageOpen, CheckCircle2, RotateCcw } from "lucide-react";
import styles from "./gallery-unboxing.module.css";
import { createEnvelopeOpeningTimeline } from "./envelope-opening-timeline";
import { createEnvelopeResultTimeline, getContainedPhotoBounds, type EnvelopeResultBounds } from "./envelope-result-timeline";

type GalleryUnboxingStyle = "packaging" | "envelope";
const UnboxingContext = createContext<{ enabled: boolean; replay: () => void } | null>(null);

export function GalleryUnboxingReplay() {
  const unboxing = useContext(UnboxingContext);
  if (!unboxing?.enabled) return null;
  return <div className={styles.replayBar}><button data-gallery-button onClick={unboxing.replay}><RotateCcw size={15} /> Ulang unboxing</button></div>;
}

export function GalleryUnboxing({ children, sessionId, photoUrl, brandName, logoUrl, subtitle, enabled, style = "packaging", loading = false, autoOpen = true }: {
  children: ReactNode; sessionId: string; photoUrl?: string; brandName: string; logoUrl: string; subtitle: string; enabled: boolean; style?: GalleryUnboxingStyle; loading?: boolean; autoOpen?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [opening, setOpening] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [resultReady, setResultReady] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const overlay = useRef<HTMLDivElement>(null);
  const pouch = useRef<HTMLDivElement>(null);
  const seal = useRef<HTMLButtonElement>(null);
  const packagingSeal = useRef<HTMLDivElement>(null);
  const tear = useRef<HTMLDivElement>(null);
  const envelopeRear = useRef<HTMLDivElement>(null);
  const envelopePocket = useRef<HTMLDivElement>(null);
  const envelopeFlapLayer = useRef<HTMLDivElement>(null);
  const envelopeFlap = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const intact = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLDivElement>(null);
  const photoBacking = useRef<HTMLDivElement>(null);
  const photoImage = useRef<HTMLImageElement>(null);
  const resultBounds = useRef<EnvelopeResultBounds | null>(null);
  const countdownTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const exiting = useRef(false);
  const content = useRef<HTMLDivElement>(null);
  const skip = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ id: number; start: number; width: number } | null>(null);
  const progress = useRef(0);
  const busy = useRef(false);
  const animation = useRef<gsap.core.Timeline | null>(null);
  const envelopeAnimationContext = useRef<gsap.Context | null>(null);
  const key = `poskart:unboxed:${sessionId}`;

  const clearCountdown = useCallback(() => {
    countdownTimers.current.forEach(clearTimeout);
    countdownTimers.current = [];
  }, []);

  useEffect(() => () => {
    clearCountdown();
    animation.current?.kill();
    envelopeAnimationContext.current?.revert();
  }, [clearCountdown]);

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

  const finish = useCallback(() => {
    clearCountdown();
    exiting.current = true;
    animation.current?.kill();
    try { sessionStorage.setItem(key, "1"); } catch { /* Continue without persistence. */ }
    setVisible(false);
    requestAnimationFrame(() => content.current?.focus({ preventScroll: true }));
  }, [clearCountdown, key]);

  function paint(value: number) {
    progress.current = value;
    // Keep the pouch completely still while swiping. The only feedback is the
    // rip spreading from the right notch; the layers separate after release.
    if (tear.current) tear.current.style.clipPath = `inset(0 0 0 ${(1 - value) * 100}%)`;
  }

  function resetScene() {
    clearCountdown();
    resultBounds.current = null;
    animation.current?.kill();
    envelopeAnimationContext.current?.revert();
    envelopeAnimationContext.current = null;
    progress.current = 0;
    drag.current = null;
    paint(0);
    // After leaving the gallery overlay these refs are unmounted. Replay will
    // create fresh layers; GSAP cannot reset an array of null targets.
    if (!pouch.current) return;
    if (style === "envelope") {
      gsap.set([seal.current, envelopeRear.current, envelopePocket.current, envelopeFlapLayer.current, envelopeFlap.current, photo.current], { clearProps: "all" });
      return;
    }
    gsap.set([packagingSeal.current, intact.current, tear.current, body.current, photo.current], { clearProps: "all" });
  }

  function revealResult() {
    if (style === "envelope" && photoBacking.current) {
      resultBounds.current = {
        backing: photoBacking.current.getBoundingClientRect(),
        image: photoImage.current ? getContainedPhotoBounds(photoImage.current) : undefined,
      };
    }
    try { sessionStorage.setItem(key, "1"); } catch { /* Continue without persistence. */ }
    setRevealed(true);
    if (style !== "envelope") setResultReady(true);
    skip.current?.focus({ preventScroll: true });
  }

  useLayoutEffect(() => {
    if (!visible || !revealed || style !== "envelope" || !photoBacking.current || !resultBounds.current) return;
    const backing = photoBacking.current;
    const before = resultBounds.current;
    const context = gsap.context(() => {
      animation.current = createEnvelopeResultTimeline(backing, photoImage.current, before, () => {
        if (!exiting.current) setResultReady(true);
      }, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }, pouch);
    return () => context.revert();
  }, [visible, revealed, style]);

  function open() {
    if (busy.current || loading) return;
    busy.current = true;
    drag.current = null;
    setOpening(true);
    const driver = { value: progress.current };
    animation.current?.kill();
    if (style !== "envelope" && photo.current) photo.current.style.opacity = "1";
    if (style === "envelope") {
      const layers = {
        seal: seal.current,
        flap: envelopeFlap.current,
        flapLayer: envelopeFlapLayer.current,
        rear: envelopeRear.current,
        pocket: envelopePocket.current,
        photo: photo.current,
      };
      const { seal: waxSeal, flap, flapLayer, rear, pocket, photo: card } = layers;
      if (!waxSeal || !flap || !flapLayer || !rear || !pocket || !card) {
        busy.current = false;
        setOpening(false);
        return;
      }
      envelopeAnimationContext.current?.revert();
      envelopeAnimationContext.current = gsap.context(() => {
        animation.current = createEnvelopeOpeningTimeline({ seal: waxSeal, flap, flapLayer, rear, pocket, photo: card }, revealResult, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      }, pouch);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        paint(1);
        gsap.set([intact.current, tear.current], { opacity: 0 });
        gsap.set([body.current, packagingSeal.current], { opacity: 0 });
        gsap.set(photo.current, { opacity: 1, yPercent: -10, scale: 1.04 });
        revealResult();
        return;
      }
      animation.current = gsap.timeline({ onComplete: revealResult })
        .to(driver, { value: 1, duration: .45, onUpdate: () => paint(driver.value), ease: "power2.out" })
        .to(intact.current, { opacity: 0, duration: .22 }, .2)
        .to(tear.current, { opacity: 0, duration: .2 }, .22)
        .to(packagingSeal.current, { opacity: 0, duration: .35 }, .58)
        .to(photo.current, { yPercent: -10, scale: 1.04, duration: .65, ease: "power3.out" }, .45)
        .to(body.current, { opacity: 0, duration: .25 }, .85);
      return;
  }

  const enterGallery = useCallback(() => {
    if (exiting.current) return;
    exiting.current = true;
    clearCountdown();
    animation.current?.kill();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { finish(); return; }
    animation.current = gsap.timeline({ onComplete: finish })
      .to(photo.current, { ...(style === "envelope" ? {} : { scale: 1.28 }), opacity: 0, duration: .3, ease: "power2.in" })
      .to(overlay.current, { opacity: 0, duration: .35 }, .12);
  }, [clearCountdown, finish, style]);

  useEffect(() => {
    if (!visible || !resultReady || loading) return;
    countdownTimers.current = [1, 2, 3, 4, 5].map(second => setTimeout(() => {
      if (second === 5) enterGallery();
      else setCountdown(5 - second);
    }, second * 1000));
    return clearCountdown;
  }, [visible, resultReady, loading, enterGallery, clearCountdown]);

  function replay() {
    if (loading) return;
    resetScene();
    busy.current = false;
    exiting.current = false;
    setOpening(false);
    setRevealed(false);
    setResultReady(false);
    setCountdown(5);
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
    {visible && <div ref={overlay} data-revealed={revealed} data-result-ready={resultReady} data-loading={loading} className={`${styles.overlay} ${style === "envelope" ? styles.envelopeOverlay : ""}`} role="dialog" aria-modal="true" aria-labelledby="unboxing-title"
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
        <div className={styles.intro}><h1 id="unboxing-title">{loading ? "Foto Anda sedang disiapkan." : revealed ? "Foto Anda sudah siap." : "Foto Anda sudah siap."}</h1><p>{loading ? "Foto sedang diunggah. Paket akan bisa dibuka setelah selesai." : revealed ? "Lihat dan unduh semua foto dari sesi Anda." : style === "envelope" ? "Klik segel lilin di tengah amplop untuk membukanya." : "Tarik seal dari kanan ke kiri untuk membuka paket."}</p></div>
       {style === "envelope" ? <div ref={pouch} className={`${styles.pouch} ${styles.envelopePouch}`}>
         <div ref={envelopeRear} className={styles.envelopeRear} aria-hidden="true"><img src="/landing/gallery-envelope-inside.webp" alt="" draggable={false} onError={finish} /></div>
         <div ref={photo} className={`${styles.photo} ${styles.envelopeCard}`}><div ref={photoBacking} className={styles.photoBacking} aria-hidden="true" />{photoUrl && <img ref={photoImage} src={photoUrl} alt="Foto hasil sesi Anda" onError={finish} />}</div>
         <div ref={envelopePocket} className={styles.envelopePocket} aria-hidden="true"><img src="/landing/gallery-envelope-pocket.webp" alt="" draggable={false} onError={finish} /></div>
         <div ref={envelopeFlapLayer} className={styles.envelopeFlapLayer} aria-hidden="true">
           <div ref={envelopeFlap} className={styles.envelopeFlap}>
             <img className={styles.envelopeFlapFront} src="/landing/gallery-envelope-flap.webp" alt="" draggable={false} onError={finish} />
             <img className={styles.envelopeFlapInside} src="/landing/gallery-envelope-flap-inside.webp" alt="" draggable={false} onError={finish} />
           </div>
         </div>
         <button ref={seal} type="button" className={styles.waxSeal} aria-label="Klik segel lilin untuk membuka amplop" disabled={opening || loading} onClick={open}><img src="/landing/gallery-envelope-wax.webp" alt="" draggable={false} onError={finish} /></button>
       </div> : <div ref={pouch} className={styles.pouch}>
        <div ref={photo} className={styles.photo}>{photoUrl && <img src={photoUrl} alt="Foto hasil sesi Anda" onError={finish} />}</div>
        <div ref={body} className={styles.body}><img src="/landing/gallery-pouch-navy-body.webp" alt="" draggable={false} onError={finish} /></div>
        <div ref={packagingSeal} className={styles.seal}><img src="/landing/gallery-pouch-navy-top.webp" alt="" draggable={false} onError={finish} /></div>
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
          <span className={styles.notch}><ArrowLeft size={22} strokeWidth={2.5} aria-hidden="true" /></span>
        </button>
       </div>}
       <div className={styles.actions}>
          {loading ? <><p className={styles.loadingState} aria-live="polite"><span /> Foto sedang diunggah…</p><small>Halaman ini akan memperbarui otomatis saat foto siap.</small></> : revealed ? <><p className={styles.success}><CheckCircle2 size={14} /> Foto Anda sudah siap</p><button data-gallery-button className={styles.viewAll} onClick={enterGallery}>Lihat semua foto <ArrowRight size={17} /></button><small>Foto original, Live Photo, dan pilihan download ada di dalam.</small><p className={styles.countdown} role="timer">{resultReady ? <>Galeri terbuka otomatis dalam <strong>{countdown} detik</strong></> : "Menyiapkan tampilan foto…"}</p></> : <><p aria-live="polite">{opening ? (style === "envelope" ? "Membuka amplop…" : "Membuka paket foto…") : style === "envelope" ? "Klik segel lilin, atau gunakan tombol di bawah." : "Atau buka dengan satu ketukan."}</p><button onClick={open} disabled={opening}><PackageOpen size={17} /> {style === "envelope" ? "Buka amplop" : "Buka paket"}</button></>}
      </div>
    </div>}
  </UnboxingContext.Provider>;
}
