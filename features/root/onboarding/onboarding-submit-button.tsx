"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function OnboardingSubmitButton({
  children,
  pendingLabel,
  variant = "default",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: "default" | "outline";
}) {
  const { pending } = useFormStatus();

  return (
    <>
      <Button
        type="submit"
        className="w-full"
        size="lg"
        variant={variant}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {pending ? pendingLabel : children}
      </Button>
      {pending ? (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-zinc-950/20 p-6 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
        >
          <div className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-7 text-center shadow-2xl">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-zinc-100">
              <LoaderCircle className="size-6 animate-spin text-zinc-900" />
            </div>
            <p className="mt-4 text-base font-semibold tracking-tight text-zinc-950">
              Menyiapkan workspace
            </p>
            <p className="mt-1.5 text-sm leading-6 text-zinc-500">
              Data akun sedang disiapkan. Jangan tutup halaman ini.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
