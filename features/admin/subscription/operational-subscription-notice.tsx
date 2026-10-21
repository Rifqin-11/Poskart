"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function OperationalSubscriptionNotice() {
  return (
    <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm">
      <p className="font-semibold text-zinc-950">Belum ada subscription aktif</p>
      <p className="leading-6 text-zinc-600">
        Anda tetap bisa menjelajahi admin dan menyiapkan konfigurasi. Aktifkan
        subscription untuk membuat transaksi, pairing, dan mengoperasikan device,
        termasuk melalui login email.
      </p>
      <Link href="/settings?tab=organization&subscription=required" className={buttonVariants()}>
        Aktifkan subscription
      </Link>
    </div>
  );
}
