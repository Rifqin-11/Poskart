"use client";

import Link from "next/link";
import { AlertTriangle, LayoutDashboard, RefreshCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function AdminError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[calc(100dvh-6rem)] items-center justify-center p-6">
      <section className="w-full max-w-xl overflow-hidden rounded-[28px] border border-amber-200 bg-white shadow-[0_24px_70px_rgba(120,53,15,0.12)]">
        <div className="border-b border-amber-100 bg-amber-50 px-7 py-5">
          <span className="grid size-10 place-items-center rounded-2xl bg-amber-100 text-amber-800">
            <AlertTriangle className="size-5" />
          </span>
        </div>
        <div className="px-7 py-7">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
            Halaman admin belum dapat dimuat
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Data Anda tidak diubah. Coba muat ulang halaman. Jika masalah tetap
            terjadi, kembali ke Dashboard lalu coba lagi.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button className="rounded-full" onClick={reset}>
              <RefreshCw className="size-4" /> Coba lagi
            </Button>
            <Link
              href="/dashboard"
              className={buttonVariants({
                variant: "outline",
                className: "rounded-full",
              })}
            >
              <LayoutDashboard className="size-4" /> Ke Dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
