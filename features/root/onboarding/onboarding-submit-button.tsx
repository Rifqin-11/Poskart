"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { LandingButton } from "@/components/ui/landing-button";

export function OnboardingSubmitButton({
  children,
  pendingLabel,
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "outlineLight";
}) {
  const { pending } = useFormStatus();

  return (
    <>
      <LandingButton
        type="submit"
        className="w-full justify-between"
        size="md"
        variant={variant}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {pending ? pendingLabel : children}
      </LandingButton>
      {pending ? (
        <div
          className="pointer-events-none fixed left-1/2 top-1/2 z-[70] w-[calc(100%-2rem)] max-w-xs -translate-x-1/2 -translate-y-1/2"
          role="status"
          aria-live="polite"
        >
          <div className="pointer-events-auto w-full rounded-2xl border border-white/90 bg-white/95 p-4 text-center shadow-[0_18px_50px_rgba(0,53,123,0.18)] backdrop-blur-xl">
            <div className="mx-auto grid size-9 place-items-center rounded-xl bg-blue-50 text-[#00357B]">
              <LoaderCircle className="size-5 animate-spin" />
            </div>
            <p className="mt-3 text-sm font-semibold tracking-tight text-zinc-950">
              Preparing your workspace
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Keep this form open while we finish.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
