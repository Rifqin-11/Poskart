"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function PaidInfoCard() {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="rounded-xl bg-zinc-50/80 px-3.5 py-2.5 text-xs text-zinc-600 transition-colors border border-zinc-100/80">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="shrink-0 rounded-md bg-zinc-950 px-2 py-0.5 text-[10px] font-semibold text-white">
            Berbayar
          </span>
          <span className="truncate text-zinc-700 font-medium text-[12px]">
            Pengunjung memilih paket & membayar di kiosk sebelum sesi foto.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className="inline-flex items-center gap-1 font-semibold text-zinc-500 hover:text-zinc-950 transition-colors text-[11px] shrink-0"
        >
          <span>{showMore ? "Tutup" : "Selengkapnya"}</span>
          <ChevronDown
            className={cn(
              "size-3 transition-transform duration-200",
              showMore && "rotate-180",
            )}
          />
        </button>
      </div>

      <AnimatePresence>
        {showMore && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-2.5 space-y-2 border-t border-zinc-200/60 pt-2.5 text-zinc-600">
              <p className="leading-relaxed">
                Harga paket, promo, pengunduhan QR foto, serta batas cetak foto dapat diatur secara fleksibel untuk setiap paket reguler.
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500 font-medium pt-0.5">
                <span>✓ Alur berbayar / digital payment</span>
                <span>✓ Pengaturan promo & batas cetak</span>
                <span>✓ Dukungan Live Photo & GIF</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function EventInfoCard() {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="rounded-xl bg-blue-50/50 px-3.5 py-2.5 text-xs text-zinc-600 transition-colors border border-blue-100/60">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="shrink-0 rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
            Gratis
          </span>
          <span className="truncate text-zinc-700 font-medium text-[12px]">
            Pengunjung langsung memulai sesi tanpa memilih paket atau pembayaran.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-900 transition-colors text-[11px] shrink-0"
        >
          <span>{showMore ? "Tutup" : "Selengkapnya"}</span>
          <ChevronDown
            className={cn(
              "size-3 transition-transform duration-200",
              showMore && "rotate-180",
            )}
          />
        </button>
      </div>

      <AnimatePresence>
        {showMore && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-2.5 space-y-2 border-t border-blue-200/50 pt-2.5 text-zinc-600">
              <p className="leading-relaxed">
                Sesi gratis yang ditanggung penyelenggara. Akses ini hanya berlaku pada unit kiosk yang telah dialokasikan untuk event tersebut.
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-blue-700/80 font-medium pt-0.5">
                <span>✓ Sesi instan tanpa checkout</span>
                <span>✓ Khusus kiosk teralokasi</span>
                <span>✓ Pengaturan nama & batas waktu event</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
