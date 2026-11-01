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
           Your photobooth workspace could not load
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
           Your session is safe. Reload the page to continue setting up your
           photobooth workspace.
        </p>
        <Button className="mt-6 rounded-full" onClick={reset}>
           <RefreshCw className="size-4" /> Try again
        </Button>
      </section>
    </main>
  );
}
