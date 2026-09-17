"use client";

import { useRef, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useNearViewport } from "./use-near-viewport";
import { ArrowRight, Camera, Printer, FileUp, Wifi, Lock } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const offlineFeatures = [
  { icon: Camera, title: "Pengambilan foto", desc: "Kamera, preview, dan retake tetap berjalan." },
  { icon: Printer, title: "Cetak lokal", desc: "Direct printing melalui USB ESC/POS." },
  { icon: Lock, title: "Cash via voucher", desc: "Voucher yang tersimpan di device." },
  { icon: FileUp, title: "Antrean upload", desc: "Foto disimpan dan akan diupload nanti." },
] as const;

const onlineRequirements = [
  { title: "QRIS & payment", desc: "Pembayaran QRIS memerlukan koneksi ke server." },
  { title: "Pairing device", desc: "Device baru harus dipairing secara online." },
  { title: "Upload gallery", desc: "Hasil foto perlu upload ke cloud." },
  { title: "Web download", desc: "Halaman download tamu tersedia setelah upload selesai." },
] as const;

export function OfflineSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const nearViewport = useNearViewport(sectionRef);

  useLayoutEffect(() => {
    if (!nearViewport) return;
    if (!sectionRef.current) return;
    const context = gsap.context(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      gsap.from("[data-offline-heading]", {
        autoAlpha: 0,
        x: -36,
        duration: 0.75,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 76%", once: true },
      });

      gsap.from("[data-offline-grid]", {
        autoAlpha: 0,
        y: 32,
        stagger: 0.1,
        duration: 0.6,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 82%", once: true },
      });
    }, sectionRef);
    return () => context.revert();
  }, [nearViewport]);

  return (
    <section ref={sectionRef} id="offline" className="scroll-mt-[72px] overflow-hidden bg-[#f7f9ff]">
      <div className="mx-auto max-w-[90rem] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div data-offline-heading className="mb-16 grid gap-10 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Fleksibilitas Operasional
            </p>
            <h2 className="mt-4 text-4xl font-black leading-[0.96] tracking-[-0.04em] text-zinc-950 sm:text-6xl">
              Tetap Mengambil Foto Saat Koneksi Terganggu
            </h2>
            <p className="mt-5 text-base leading-7 text-zinc-600 sm:text-lg">
              Device yang sudah dipasangkan dapat menjalankan sesi menggunakan konfigurasi dan aset yang telah tersimpan. Operator dapat menerima pembayaran cash melalui voucher, mengambil foto, dan mencetak hasil secara lokal.
            </p>
          </div>

          <div className="hidden lg:block">
            <ArrowRight className="size-12 text-zinc-400 rotate-90" />
          </div>

          <div className="max-w-lg">
            <p className="text-sm leading-7 text-zinc-600">
              Foto disimpan dalam antrean perangkat dan di-upload kembali ketika koneksi tersedia. QRIS, pairing device baru, sinkronisasi konfigurasi, serta halaman download membutuhkan internet.
            </p>
          </div>
        </div>

        <div data-offline-grid className="grid gap-8 lg:grid-cols-2">
          {/* Offline Features */}
          <div className="space-y-6 rounded-3xl border border-blue-100 bg-white p-8">
            <h3 className="text-xl font-bold text-zinc-900">Tetap Berjalan Offline</h3>
            <div className="space-y-4">
              {offlineFeatures.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-8 place-items-center rounded-lg bg-emerald-50">
                    <Icon className="size-4 text-emerald-600" strokeWidth={1.5} />
                  </span>
                  <div>
                    <p className="font-semibold text-zinc-900">{title}</p>
                    <p className="text-sm text-zinc-600">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Online Requirements */}
          <div className="space-y-6 rounded-3xl border border-red-100 bg-white p-8">
            <h3 className="text-xl font-bold text-zinc-900">Membutuhkan Internet</h3>
            <div className="space-y-4">
              {onlineRequirements.map(({ title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-8 place-items-center rounded-lg bg-red-50">
                    <Wifi className="size-4 text-red-600" strokeWidth={1.5} />
                  </span>
                  <div>
                    <p className="font-semibold text-zinc-900">{title}</p>
                    <p className="text-sm text-zinc-600">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Auto-sync info */}
        <div className="mt-12 rounded-2xl border border-blue-100 bg-blue-50 p-6">
          <div className="flex items-start gap-3">
            <FileUp className="mt-1 size-5 text-[#00357B]" strokeWidth={1.5} />
            <div>
              <p className="font-semibold text-zinc-900">Sinkronisasi Otomatis Setelah Online</p>
              <p className="mt-1 text-sm text-zinc-600">
                Ketika koneksi kembali, POSKART akan menyinkronkan transaksi yang tertunda, melanjutkan antrean upload foto, membuat gallery session, dan menampilkan foto di halaman download setelah upload selesai.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
