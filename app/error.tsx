"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The server logs retain the detailed cause; only a digest is logged here.
    console.error("[app-error]", { digest: error.digest });
  }, [error.digest]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f6f8] p-6 text-zinc-950">
      <section className="w-full max-w-md rounded-[28px] border border-zinc-200 bg-white p-7 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <h1 className="text-xl font-semibold tracking-tight">
          POSKART sedang mengalami gangguan
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          Coba muat ulang halaman. Jika masalah berlanjut, silakan hubungi tim
          POSKART.
        </p>
        <Button className="mt-6 rounded-full" onClick={reset}>
          <RefreshCw className="size-4" /> Muat ulang
        </Button>
      </section>
    </main>
  );
}
