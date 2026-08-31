"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OnboardingError({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f5f6f8] p-6 text-zinc-950">
      <section className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-700">
          <span className="text-xl font-bold">!</span>
        </div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">
          Workspace belum dapat dimuat
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          Sesi Anda tetap aman. Muat ulang halaman untuk melanjutkan pengaturan
          workspace POSKART.
        </p>
        <Button className="mt-6 rounded-full" onClick={reset}>
          <RefreshCw className="size-4" /> Coba lagi
        </Button>
      </section>
    </main>
  );
}
