"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import {
  Camera,
  CreditCard,
  MonitorSmartphone,
  Palette,
  Printer,
  QrCode,
  CheckCircle2,
  Grid,
  Check,
  RefreshCw,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Sliders,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════
   SCROLL-LINKED FEATURE CARD — Sticky Layout with Step State
   ═══════════════════════════════════════════════════════════════════ */

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  return isMobile;
}

function ScrollyCard({
  children,
  scrollHeight = "180vh",
  className,
  isMobile,
  containerRef,
}: {
  children: React.ReactNode;
  scrollHeight?: string;
  className?: string;
  isMobile: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (isMobile) {
    return (
      <div className={cn("relative py-8 px-3 sm:px-6", className)}>
        {children}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative", className)} style={{ height: scrollHeight }}>
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden px-3 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CARD 1 — visual Builder (Design)
   ═══════════════════════════════════════════════════════════════════ */

function DesignCard() {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const [activeStep, setActiveStep] = useState(0);

  // Detect active step on scroll to highlight sidebar
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (isMobile) return;
    if (latest < 0.25) setActiveStep(0);
    else if (latest < 0.5) setActiveStep(1);
    else if (latest < 0.75) setActiveStep(2);
    else setActiveStep(3);
  });

  // Horizontal slider offset for iPad preview screen
  const sliderX = useTransform(
    scrollYProgress,
    [0, 0.22, 0.28, 0.47, 0.53, 0.72, 0.78, 1],
    ["0%", "0%", "-25%", "-25%", "-50%", "-50%", "-75%", "-75%"]
  );

  const steps = [
    { label: "Layar Pembuka", desc: "Splash screen 'Tap to Start'" },
    { label: "Pilih Template", desc: "Grid pemilihan layout frame" },
    { label: "Camera Page", desc: "Live preview & capture timer" },
    { label: "Preview Page", desc: "Pratinjau foto & trigger print" },
  ];

  return (
    <ScrollyCard containerRef={containerRef} isMobile={isMobile} scrollHeight="200vh">
      <div className="relative grid w-full max-w-5xl gap-6 lg:gap-8 overflow-hidden rounded-3xl sm:rounded-[2.5rem] border border-zinc-200 bg-white p-4 sm:p-10 shadow-xl shadow-zinc-200/50 lg:grid-cols-[0.9fr_1.1fr]">
            {/* Left Column: Info & Indicators */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600">
                  <Palette className="size-3.5" />
                  DESIGN BOOTH
                </div>
                <h2 className="text-3xl font-bold tracking-[-0.04em] text-zinc-950 sm:text-4xl">
                  Rancang alur aplikasi photobooth.
                </h2>
                <p className="mt-3 text-sm leading-7 text-zinc-500">
                  Visualisasikan layar utama perangkat Flutter booth Anda. Desain layout frame, atur live feed kamera, hingga konfirmasi cetak.
                </p>
              </div>

              {/* Sidebar Indicators */}
              <div className="mt-8 space-y-3">
                {steps.map((step, idx) => (
                  <div
                    key={step.label}
                    onClick={() => isMobile && setActiveStep(idx)}
                    className={cn(
                      "flex items-center gap-4 rounded-xl border p-3.5 transition-all duration-300",
                      isMobile ? "cursor-pointer hover:border-zinc-300" : "",
                      activeStep === idx
                        ? "border-rose-200 bg-rose-50/50 shadow-sm"
                        : "border-transparent bg-transparent opacity-50"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                        activeStep === idx
                          ? "bg-rose-500 text-white"
                          : "bg-zinc-100 text-zinc-400"
                      )}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-950">{step.label}</h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: iPad Mockup Slider */}
            <div className="flex items-center justify-center">
              <div className="relative w-full h-[280px] xs:h-[310px] sm:h-[340px] lg:h-auto lg:aspect-[4/3] max-w-[460px] rounded-3xl bg-zinc-950 p-3 shadow-2xl border-4 border-zinc-800">
                {/* Screen container */}
                <div className="relative h-full w-full overflow-hidden rounded-xl bg-zinc-50">
                  {/* Slider wrapper */}
                  <motion.div
                    style={{ x: isMobile ? `${activeStep * -25}%` : sliderX }}
                    className="flex h-full w-[400%] transition-transform duration-300 ease-out"
                  >
                    {/* Screen 1: Layar Pembuka */}
                    <div className="w-1/4 h-full shrink-0 bg-gradient-to-br from-rose-50 to-orange-50 flex flex-col justify-between p-6 text-center select-none">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold tracking-widest text-rose-500">POSKART</span>
                        <div className="flex gap-1">
                          <span className="size-1.5 rounded-full bg-zinc-300" />
                          <span className="size-1.5 rounded-full bg-zinc-300" />
                        </div>
                      </div>
                      <div className="my-auto flex flex-col items-center">
                        <div className="grid size-14 place-items-center rounded-full bg-white shadow-md border border-rose-100/50 text-rose-500 mb-4 animate-pulse">
                          <Camera className="size-6" />
                        </div>
                        <h3 className="text-sm font-black tracking-tight text-zinc-950">POSKART Photobooth</h3>
                        <p className="text-[10px] text-zinc-400 mt-1">Tap layar untuk mengabadikan momen serumu</p>
                      </div>
                      <div className="mx-auto w-full max-w-[200px] rounded-full bg-rose-500 py-2.5 text-[10px] font-bold text-white shadow-md shadow-rose-200/50">
                        MULAI SEKARANG
                      </div>
                    </div>

                    {/* Screen 2: Pemilihan Template */}
                    <div className="w-1/4 h-full shrink-0 bg-white flex flex-col justify-between p-5 select-none">
                      <div className="border-b border-zinc-100 pb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-900">Pilih Layout Frame</span>
                        <span className="text-[9px] text-zinc-400">Step 2 of 4</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 my-auto">
                        {[
                          { name: "Classic Strip", desc: "3 vertical photos", active: true },
                          { name: "Polaroid Grid", desc: "2x2 layout", active: false },
                          { name: "Single Square", desc: "1 large photo", active: false },
                          { name: "Dual Landscape", desc: "Side by side", active: false },
                        ].map((item) => (
                          <div
                            key={item.name}
                            className={cn(
                              "rounded-xl border p-2.5 text-left transition-colors relative",
                              item.active
                                ? "border-rose-500 bg-rose-50/20"
                                : "border-zinc-200 hover:border-zinc-300"
                            )}
                          >
                            {item.active && (
                              <span className="absolute top-1.5 right-1.5 grid size-3.5 place-items-center rounded-full bg-rose-500 text-white">
                                <Check className="size-2" />
                              </span>
                            )}
                             <div className="h-7 sm:h-10 rounded bg-zinc-50 border border-zinc-100 mb-1 flex items-center justify-center">
                               <Grid className="size-3.5 text-zinc-300" />
                             </div>
                            <h4 className="text-[10px] font-bold text-zinc-950">{item.name}</h4>
                            <p className="text-[8px] text-zinc-400 mt-0.5">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between gap-2">
                        <div className="rounded-full border border-zinc-200 px-3 py-1.5 text-[9px] font-bold text-zinc-500">Kembali</div>
                        <div className="rounded-full bg-rose-500 px-4 py-1.5 text-[9px] font-bold text-white">Lanjutkan</div>
                      </div>
                    </div>

                    {/* Screen 3: Camera Page */}
                    <div className="w-1/4 h-full shrink-0 bg-zinc-950 flex flex-col justify-between p-5 relative select-none">
                      {/* Top status */}
                      <div className="flex items-center justify-between text-white z-10">
                        <span className="text-[8px] tracking-widest opacity-60">CAMERA STREAM</span>
                        <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[8px] font-medium">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                          Ready
                        </div>
                      </div>

                      {/* Camera viewfinder placeholder */}
                      <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 border border-zinc-800">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />
                        {/* Shutter Countdown overlay */}
                        <div className="z-10 grid size-20 place-items-center rounded-full bg-black/40 border-2 border-white/20 backdrop-blur-sm">
                          <span className="text-3xl font-black tracking-tight text-white animate-scale">03</span>
                        </div>
                      </div>

                      {/* Side captures bar */}
                      <div className="mt-auto flex justify-between items-center z-10">
                        <div className="flex gap-1.5">
                          <div className="size-8 rounded border border-white/20 bg-zinc-800/80" />
                          <div className="size-8 rounded border border-white/10 bg-zinc-900/50" />
                        </div>
                        <div className="grid size-9 place-items-center rounded-full bg-white text-zinc-950 shadow">
                          <Camera className="size-4" />
                        </div>
                      </div>
                    </div>

                    {/* Screen 4: Preview Page */}
                    <div className="w-1/4 h-full shrink-0 bg-white flex flex-col justify-between p-5 select-none">
                      <div className="border-b border-zinc-100 pb-2">
                        <h4 className="text-[10px] font-bold text-zinc-950">Pratinjau Hasil Foto</h4>
                      </div>
                      
                      <div className="grid grid-cols-[1fr_120px] gap-4 my-auto">
                        {/* Mock vertical photo strip */}
                        <div className="h-20 sm:h-28 aspect-[2/3] border-4 border-zinc-100 bg-zinc-50 shadow-sm p-1 flex flex-col gap-0.5 mx-auto rounded-md">
                          <div className="flex-1 rounded bg-rose-100" />
                          <div className="flex-1 rounded bg-orange-100" />
                          <div className="flex-1 rounded bg-amber-100" />
                          <span className="text-[5px] font-mono text-center text-zinc-400 mt-0.5">POSKART EVENT</span>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col justify-center gap-2">
                          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-2.5 text-center">
                            <Printer className="size-4 text-emerald-500 mx-auto mb-1" />
                            <p className="text-[8px] font-bold text-emerald-800">Cetak Foto</p>
                          </div>
                          <div className="rounded-xl border border-zinc-200 p-2 text-center hover:bg-zinc-50">
                            <QrCode className="size-3.5 text-zinc-500 mx-auto mb-0.5" />
                            <p className="text-[7px] font-medium text-zinc-600">Scan QR Code</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <div className="rounded-full bg-rose-500 px-4 py-1.5 text-[9px] font-bold text-white">Selesai & Keluar</div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
    </ScrollyCard>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CARD 2 — POS & Financial Operations (Operate)
   ═══════════════════════════════════════════════════════════════════ */

function OperateCard() {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const [activeStep, setActiveStep] = useState(0);

  // Detect active step on scroll to highlight sidebar
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (isMobile) return;
    if (latest < 0.35) setActiveStep(0);
    else if (latest < 0.7) setActiveStep(1);
    else setActiveStep(2);
  });

  // Horizontal slider offset for Desktop Browser dashboard
  const sliderX = useTransform(
    scrollYProgress,
    [0, 0.3, 0.4, 0.65, 0.75, 1],
    ["0%", "0%", "-33.33%", "-33.33%", "-66.66%", "-66.66%"]
  );

  const steps = [
    { label: "POS Kasir", desc: "Pencatatan paket cetak & bayar QRIS" },
    { label: "Manajemen Keuangan", desc: "Monitoring revenue & statistik harian" },
    { label: "Data Transaksi", desc: "Log histori transaksi real-time" },
  ];

  return (
    <ScrollyCard containerRef={containerRef} isMobile={isMobile} scrollHeight="190vh">
      <div className="relative grid w-full max-w-5xl gap-6 lg:gap-8 overflow-hidden rounded-3xl sm:rounded-[2.5rem] border border-zinc-200 bg-white p-4 sm:p-10 shadow-xl shadow-zinc-200/50 lg:grid-cols-[0.9fr_1.1fr]">
            {/* Left Column: Info & Indicators */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600">
                  <CreditCard className="size-3.5" />
                  KASIR OPERASIONAL
                </div>
                <h2 className="text-3xl font-bold tracking-[-0.04em] text-zinc-950 sm:text-4xl">
                  Kasir dan kelola transaksi operator.
                </h2>
                <p className="mt-3 text-sm leading-7 text-zinc-500">
                  Dashboard terpadu untuk kasir kas kas kecil, generate invoice pembayaran QRIS otomatis, dan melihat performa keuangan harian.
                </p>
              </div>

              {/* Sidebar Indicators */}
              <div className="mt-8 space-y-3">
                {steps.map((step, idx) => (
                  <div
                    key={step.label}
                    onClick={() => isMobile && setActiveStep(idx)}
                    className={cn(
                      "flex items-center gap-4 rounded-xl border p-3.5 transition-all duration-300",
                      isMobile ? "cursor-pointer hover:border-zinc-300" : "",
                      activeStep === idx
                        ? "border-emerald-200 bg-emerald-50/50 shadow-sm"
                        : "border-transparent bg-transparent opacity-50"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                        activeStep === idx
                          ? "bg-emerald-500 text-white"
                          : "bg-zinc-100 text-zinc-400"
                      )}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-950">{step.label}</h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Browser Dashboard Mockup */}
            <div className="flex items-center justify-center">
              <div className="relative w-full h-[280px] xs:h-[310px] sm:h-[340px] lg:h-auto lg:aspect-[1.3/1] max-w-[480px] rounded-2xl bg-zinc-950 p-2.5 shadow-2xl border border-zinc-800 flex flex-col">
                {/* Browser bar */}
                <div className="flex items-center justify-between border-b border-zinc-900 bg-zinc-950 px-3 pb-2 text-[8px] text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-rose-500/80" />
                    <span className="size-2 rounded-full bg-amber-500/80" />
                    <span className="size-2 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="rounded bg-zinc-900 px-3 py-0.5 font-mono text-[7px] text-zinc-400">
                    admin.poskart.com/dashboard
                  </span>
                  <span className="size-2 opacity-0" />
                </div>

                {/* Dashboard viewport */}
                <div className="relative flex-1 w-full overflow-hidden rounded-lg bg-zinc-50 border border-zinc-100">
                  {/* Slider wrapper */}
                  <motion.div
                    style={{ x: isMobile ? `${activeStep * -33.33}%` : sliderX }}
                    className="flex h-full w-[300%] transition-transform duration-300 ease-out"
                  >
                    {/* Screen 1: POS Kasir */}
                    <div className="w-1/3 h-full shrink-0 p-4 flex flex-col justify-between bg-zinc-50 select-none">
                      <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2">
                        <span className="text-[9px] font-bold text-zinc-800">POS KASIR EVENT</span>
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[8px] font-bold text-emerald-600">Open Shift</span>
                      </div>
                      
                      <div className="grid grid-cols-[1.2fr_0.8fr] gap-3 my-auto">
                        {/* Package List */}
                        <div className="space-y-1.5">
                          <p className="text-[7px] font-bold uppercase tracking-wider text-zinc-400">Pilih Paket Print</p>
                          {[
                            { name: "Double Print", price: "Rp 10.000", active: true },
                            { name: "Single Print", price: "Rp 6.000", active: false },
                            { name: "Triple Print", price: "Rp 14.000", active: false },
                          ].map((pkg) => (
                            <div
                              key={pkg.name}
                              className={cn(
                                "flex items-center justify-between rounded-lg border p-1.5 text-[8px] font-semibold",
                                pkg.active
                                  ? "border-emerald-500 bg-white shadow-sm"
                                  : "border-zinc-200/60 bg-zinc-100/50"
                              )}
                            >
                              <span className="text-zinc-900">{pkg.name}</span>
                              <span className="text-emerald-600">{pkg.price}</span>
                            </div>
                          ))}
                        </div>

                        {/* Payment / Checkout Area */}
                        <div className="rounded-xl border border-zinc-200 bg-white p-2 flex flex-col justify-between">
                          <div>
                            <p className="text-[7px] uppercase tracking-wider text-zinc-400">Checkout</p>
                            <p className="text-xs font-black text-zinc-900 mt-0.5">Rp 10.000</p>
                            <p className="text-[6px] text-zinc-400 mt-0.5">1x Double Print</p>
                          </div>
                          <div className="rounded-lg bg-emerald-500 py-1.5 text-center text-[8px] font-bold text-white mt-2 flex items-center justify-center gap-1">
                            <QrCode className="size-3" />
                            Bayar QRIS
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Screen 2: Manajemen Keuangan */}
                    <div className="w-1/3 h-full shrink-0 p-4 flex flex-col justify-between bg-zinc-50 select-none">
                      <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2">
                        <span className="text-[9px] font-bold text-zinc-800">RINGKASAN KEUANGAN</span>
                        <span className="text-[8px] text-zinc-400">Hari Ini</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 my-auto">
                        <div className="rounded-xl border border-zinc-200 bg-white p-2">
                          <DollarSign className="size-3 text-emerald-500" />
                          <p className="text-[6px] text-zinc-400 mt-1 uppercase">Pendapatan</p>
                          <p className="text-[10px] font-bold text-zinc-950 mt-0.5">Rp 294k</p>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-white p-2">
                          <TrendingUp className="size-3 text-sky-500" />
                          <p className="text-[6px] text-zinc-400 mt-1 uppercase">Transaksi</p>
                          <p className="text-[10px] font-bold text-zinc-950 mt-0.5">32 Sesi</p>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-white p-2">
                          <QrCode className="size-3 text-violet-500" />
                          <p className="text-[6px] text-zinc-400 mt-1 uppercase">QRIS Rate</p>
                          <p className="text-[10px] font-bold text-zinc-950 mt-0.5">98%</p>
                        </div>
                      </div>

                      {/* Mock Mini bar chart */}
                      <div className="rounded-xl border border-zinc-200 bg-white p-2">
                        <p className="text-[7px] font-bold text-zinc-400 mb-1.5 uppercase">Tren Jam Sibuk</p>
                        <div className="flex items-end justify-between gap-1.5 h-10 px-1 pt-1">
                          {[25, 45, 75, 90, 60, 40, 50, 70, 85].map((val, i) => (
                            <div key={i} className="flex-1 rounded-t-sm bg-emerald-500/20 hover:bg-emerald-500 transition-colors" style={{ height: `${val}%` }} />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Screen 3: Data Transaksi */}
                    <div className="w-1/3 h-full shrink-0 p-4 flex flex-col justify-between bg-zinc-50 select-none">
                      <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2">
                        <span className="text-[9px] font-bold text-zinc-800">RIWAYAT TRANSAKSI</span>
                        <span className="text-[7px] font-mono text-zinc-400">Live Sync</span>
                      </div>

                      {/* Transaction Table */}
                      <div className="flex-1 my-2 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-zinc-50 text-[6px] font-bold text-zinc-400 uppercase border-b border-zinc-200">
                              <th className="p-1.5">ID</th>
                              <th className="p-1.5">Paket</th>
                              <th className="p-1.5">Metode</th>
                              <th className="p-1.5">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { id: "1049", pkg: "Double", pay: "QRIS", status: "Success" },
                              { id: "1048", pkg: "Single", pay: "Cash", status: "Success" },
                              { id: "1047", pkg: "Triple", pay: "QRIS", status: "Success" },
                              { id: "1046", pkg: "Single", pay: "QRIS", status: "Failed" },
                            ].map((tx) => (
                              <tr key={tx.id} className="border-b border-zinc-100 text-[8px] text-zinc-600">
                                <td className="p-1 px-1.5 font-mono text-zinc-400">#{tx.id}</td>
                                <td className="p-1 font-semibold text-zinc-900">{tx.pkg}</td>
                                <td className="p-1">{tx.pay}</td>
                                <td className="p-1">
                                  <span className={cn(
                                    "rounded px-1 py-0.5 text-[6px] font-bold",
                                    tx.status === "Success"
                                      ? "bg-emerald-50 text-emerald-600"
                                      : "bg-rose-50 text-rose-600"
                                  )}>
                                    {tx.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
    </ScrollyCard>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CARD 3 — Device Monitor & Control (Monitor)
   ═══════════════════════════════════════════════════════════════════ */

function MonitorCard() {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const [activeStep, setActiveStep] = useState(0);

  // Detect active step on scroll to highlight sidebar
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (isMobile) return;
    if (latest < 0.35) setActiveStep(0);
    else if (latest < 0.7) setActiveStep(1);
    else setActiveStep(2);
  });

  // Horizontal slider offset for Mobile/Tablet dashboard mockup
  const sliderX = useTransform(
    scrollYProgress,
    [0, 0.3, 0.4, 0.65, 0.75, 1],
    ["0%", "0%", "-33.33%", "-33.33%", "-66.66%", "-66.66%"]
  );

  const steps = [
    { label: "Status Perangkat", desc: "Pantau kesehatan tablet booth & printer" },
    { label: "Koneksi & Sinkronisasi", desc: "Push konfigurasi & update layout cloud" },
    { label: "Aksi Jarak Jauh", desc: "Remote control restart app & test print" },
  ];

  return (
    <ScrollyCard containerRef={containerRef} isMobile={isMobile} scrollHeight="190vh">
      <div className="relative grid w-full max-w-5xl gap-6 lg:gap-8 overflow-hidden rounded-3xl sm:rounded-[2.5rem] border border-zinc-200 bg-white p-4 sm:p-10 shadow-xl shadow-zinc-200/50 lg:grid-cols-[0.9fr_1.1fr]">
            {/* Left Column: Info & Indicators */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-600">
                  <MonitorSmartphone className="size-3.5" />
                  MONITOR DEVICE
                </div>
                <h2 className="text-3xl font-bold tracking-[-0.04em] text-zinc-950 sm:text-4xl">
                  Pantau dan kendalikan booth real-time.
                </h2>
                <p className="mt-3 text-sm leading-7 text-zinc-500">
                  Lihat status hardware jarak jauh, kirim update konfigurasi frame terbaru secara instan, dan jalankan perintah remote dari cloud.
                </p>
              </div>

              {/* Sidebar Indicators */}
              <div className="mt-8 space-y-3">
                {steps.map((step, idx) => (
                  <div
                    key={step.label}
                    onClick={() => isMobile && setActiveStep(idx)}
                    className={cn(
                      "flex items-center gap-4 rounded-xl border p-3.5 transition-all duration-300",
                      isMobile ? "cursor-pointer hover:border-zinc-300" : "",
                      activeStep === idx
                        ? "border-sky-200 bg-sky-50/50 shadow-sm"
                        : "border-transparent bg-transparent opacity-50"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                        activeStep === idx
                          ? "bg-sky-500 text-white"
                          : "bg-zinc-100 text-zinc-400"
                      )}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-950">{step.label}</h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Dashboard Monitor Mockup */}
            <div className="flex items-center justify-center">
              <div className="relative w-full h-[280px] xs:h-[310px] sm:h-[340px] lg:h-auto lg:aspect-[1.3/1] max-w-[480px] rounded-2xl bg-zinc-950 p-2.5 shadow-2xl border border-zinc-800 flex flex-col">
                {/* Browser bar */}
                <div className="flex items-center justify-between border-b border-zinc-900 bg-zinc-950 px-3 pb-2 text-[8px] text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-rose-500/80" />
                    <span className="size-2 rounded-full bg-amber-500/80" />
                    <span className="size-2 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="rounded bg-zinc-900 px-3 py-0.5 font-mono text-[7px] text-zinc-400">
                    admin.poskart.com/devices
                  </span>
                  <span className="size-2 opacity-0" />
                </div>

                {/* Dashboard viewport */}
                <div className="relative flex-1 w-full overflow-hidden rounded-lg bg-zinc-50 border border-zinc-100">
                  {/* Slider wrapper */}
                  <motion.div
                    style={{ x: isMobile ? `${activeStep * -33.33}%` : sliderX }}
                    className="flex h-full w-[300%] transition-transform duration-300 ease-out"
                  >
                    {/* Screen 1: Status Perangkat */}
                    <div className="w-1/3 h-full shrink-0 p-4 flex flex-col justify-between bg-zinc-50 select-none">
                      <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2">
                        <span className="text-[9px] font-bold text-zinc-800">HARDWARE HEALTH</span>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[8px] font-bold text-emerald-600 flex items-center gap-1">
                          <span className="size-1 bg-emerald-500 rounded-full animate-ping" />
                          3 Online
                        </span>
                      </div>

                      <div className="space-y-2 my-auto">
                        {[
                          { name: "Booth A · Wedding Hall", ping: "12ms", state: "online" },
                          { name: "Booth B · Main Lobby", ping: "24ms", state: "online" },
                          { name: "Booth C · outdoor Stage", ping: "--", state: "offline" },
                        ].map((device) => (
                          <div
                            key={device.name}
                            className="flex items-center justify-between rounded-xl border border-zinc-200/60 bg-white p-2.5 text-[9px] shadow-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "size-2 rounded-full",
                                device.state === "online" ? "bg-emerald-500 animate-pulse" : "bg-zinc-300"
                              )} />
                              <span className="font-semibold text-zinc-800">{device.name}</span>
                            </div>
                            <span className="font-mono text-zinc-400">{device.ping}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Screen 2: Koneksi & Sinkronisasi */}
                    <div className="w-1/3 h-full shrink-0 p-4 flex flex-col justify-between bg-zinc-50 select-none">
                      <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2">
                        <span className="text-[9px] font-bold text-zinc-800">CLOUD DEPLOYMENT</span>
                        <span className="text-[8px] text-sky-600 flex items-center gap-1">
                          <RefreshCw className="size-2.5 animate-spin" />
                          Syncing
                        </span>
                      </div>

                      <div className="my-auto space-y-3">
                        <div className="rounded-xl border border-zinc-200 bg-white p-3">
                          <div className="flex items-center justify-between text-[8px]">
                            <span className="font-semibold text-zinc-800">Deploying &apos;Layout Frame A&apos;</span>
                            <span className="text-zinc-500 font-mono">85%</span>
                          </div>
                          <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                            <div className="h-full w-[85%] rounded-full bg-sky-500 transition-all duration-500" />
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-[8px] text-zinc-500 px-1">
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="size-3 text-emerald-500" />
                            <span>Booth A OK</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="size-3 text-emerald-500" />
                            <span>Booth B OK</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <AlertCircle className="size-3 text-amber-500 animate-pulse" />
                            <span>Booth C Syncing</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Screen 3: Aksi Jarak Jauh */}
                    <div className="w-1/3 h-full shrink-0 p-4 flex flex-col justify-between bg-zinc-50 select-none">
                      <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2">
                        <span className="text-[9px] font-bold text-zinc-800">REMOTE ACTION CONSOLE</span>
                        <span className="text-[8px] font-mono text-zinc-400">Shell Terminal</span>
                      </div>

                      <div className="grid grid-cols-[0.8fr_1.2fr] gap-3 my-auto flex-1 min-h-0 py-2">
                        {/* Remote controls */}
                        <div className="flex flex-col justify-between gap-1.5">
                          {[
                            { name: "Test Printer", icon: Printer },
                            { name: "Restart App", icon: RefreshCw },
                            { name: "Clear Cache", icon: Sliders },
                          ].map((cmd) => {
                            const Icon = cmd.icon;
                            return (
                              <div
                                key={cmd.name}
                                className="flex-1 rounded-lg border border-zinc-200 bg-white p-1.5 flex flex-col items-center justify-center text-[7px] font-bold text-zinc-700 shadow-sm active:bg-zinc-100 transition-colors"
                              >
                                <Icon className="size-3 text-sky-500 mb-1" />
                                {cmd.name}
                              </div>
                            );
                          })}
                        </div>

                        {/* Interactive terminal output */}
                        <div className="rounded-xl bg-zinc-950 p-2.5 font-mono text-[6px] text-zinc-400 flex flex-col justify-end space-y-1.5 overflow-hidden">
                          <div className="flex items-center gap-1 border-b border-zinc-900 pb-1 text-[5px] text-zinc-500">
                            <Terminal className="size-2" />
                            <span>Console.log</span>
                          </div>
                          <div className="space-y-1 flex-1 flex flex-col justify-end">
                            <p className="text-zinc-500"># connecting dev_booth_a...</p>
                            <p className="text-emerald-400 font-semibold">$ TEST_PRINT: OK (12ms)</p>
                            <p className="text-zinc-400">$ CLEAR_CACHE: Cleared 1.2 GB</p>
                            <p className="text-amber-400 flex items-center gap-0.5">
                              <span className="size-1 rounded-full bg-amber-400 animate-ping" />
                              waiting remote sync...
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
    </ScrollyCard>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN EXPORT — Feature Sections List (Premium Sticky Layout)
   ═══════════════════════════════════════════════════════════════════ */

export function ScrollyFeatures() {
  return (
    <div className="bg-zinc-50/50">
      {/* Section header */}
      <div className="mx-auto max-w-7xl px-4 pt-24 pb-8 text-center sm:px-6 lg:px-8 lg:pt-32">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
          Satu alur, dari ide hingga operasi
        </p>
        <h2 className="mx-auto mt-4 max-w-3xl text-balance text-3xl font-bold tracking-[-0.04em] text-zinc-950 sm:text-4xl lg:text-5xl">
          Scroll untuk melihat cara{" "}
          <span className="text-gradient-warm">POSKART bekerja.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-zinc-500">
          Setiap bagian platform terhubung — desain, operasi, dan monitoring ada di satu konteks.
        </p>
      </div>

      {/* Scrollytelling cards */}
      <DesignCard />
      <OperateCard />
      <MonitorCard />
    </div>
  );
}
