"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ShowcaseError({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[#f7f9ff] px-5 py-16 text-zinc-950">
      <section className="w-full max-w-lg rounded-[28px] border border-blue-100 bg-white p-8 text-center shadow-[0_24px_70px_rgba(0,53,123,0.1)]">
        <h1 className="text-2xl font-semibold tracking-tight">
          Showcase belum dapat dimuat
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          Silakan muat ulang halaman. Jika masalah berlanjut, hubungi tim
          POSKART.
        </p>
        <Button className="mt-6 rounded-full" onClick={reset}>
          <RotateCcw className="size-4" /> Coba lagi
        </Button>
      </section>
    </main>
  );
}
