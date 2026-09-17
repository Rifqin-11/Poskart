"use client";

import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { signInAction, signInWithGoogleAction, signUpAction } from "@/app/auth/actions";
import { Input } from "@/components/ui/input";
import { LandingButton } from "@/components/ui/landing-button";

export function AuthForm({
  mode,
  error,
  success,
  next,
}: {
  mode: "login" | "register";
  error?: string;
  success?: string;
  next?: string;
}) {
  const isLogin = mode === "login";
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#F7F8FA] p-4 sm:p-6 lg:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/40 bg-white shadow-[0_28px_70px_rgba(0,53,123,0.16)] sm:rounded-[36px] lg:grid-cols-[0.92fr_1.08fr]">
        {/* Brand panel */}
        <section
          aria-label="POSKART workspace"
          className="relative hidden overflow-hidden bg-[radial-gradient(120%_130%_at_20%_20%,#5FA8FF_0%,#1F6FD0_52%,#014EB4_100%)] text-white lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-12"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 top-24 size-72 rounded-full border border-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 -left-24 size-96 rounded-full border border-white/10"
          />

          <Link href="/" className="relative flex items-center gap-3">
            <span className="grid size-10 place-items-center overflow-hidden rounded-xl bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.webp" alt="" className="size-7 object-contain" />
            </span>
            <span>
              <span className="block text-sm font-bold tracking-[0.15em]">POSKART</span>
              <span className="block text-xs text-white/70">merchant workspace</span>
            </span>
          </Link>

          <div className="relative">
            <h1 className="max-w-md text-4xl font-black leading-[1.02] tracking-tight xl:text-5xl">
              {isLogin ? "Keep your business moving." : "Set up your workspace."}
            </h1>
            <p className="mt-5 max-w-sm text-base leading-7 text-white/85">
              {isLogin
                ? "Kelola booth, transaksi QRIS, template, dan hasil foto dari satu dashboard POSKART."
                : "Buat akun POSKART dan mulai kelola booth, transaksi, serta hasil foto dari satu dashboard."}
            </p>

            <ul className="mt-8 space-y-3">
              {[
                "Kelola banyak booth dari satu dashboard",
                "QRIS, voucher, dan thermal printing",
                "Tetap jalan saat offline",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-white/90">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/15 text-white">
                    <span className="text-[10px] font-bold">*</span>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-xs text-white/60">Simple tools for busy counters.</p>
        </section>

        {/* Form panel */}
        <section className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
          <div className="mx-auto w-full max-w-sm">
            <Link href="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
              <span className="grid size-9 place-items-center overflow-hidden rounded-lg bg-white ring-1 ring-zinc-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-mark.webp" alt="POSKART" className="size-6 object-contain" />
              </span>
              <span className="text-sm font-bold tracking-[0.15em] text-zinc-950">POSKART</span>
            </Link>

            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#014EB4]">
              {isLogin ? "Welcome back" : "Get started"}
            </p>
            <h2 className="mt-4 text-3xl font-black leading-[0.98] tracking-tight text-zinc-950 sm:text-4xl">
              {isLogin ? "Masuk ke dashboard." : "Buat akun POSKART."}
            </h2>
            <p className="mt-4 text-sm leading-6 text-zinc-600">
              {isLogin
                ? "Sign in to manage your store, devices, and daily sales."
                : "Create an account for POSKART dashboard access."}
            </p>

            {error ? (
              <div
                className="mt-5 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
                role="alert"
                aria-live="assertive"
              >
                <LockKeyhole className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
            {success ? (
              <div
                className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-700"
                role="status"
                aria-live="polite"
              >
                {success}
              </div>
            ) : null}

            <form action={signInWithGoogleAction} onSubmit={() => setIsSubmitting(true)} className="mt-6">
              {next ? <input type="hidden" name="next" value={next} /> : null}
              <LandingButton
                variant="secondary"
                size="lg"
                className="h-12 w-full rounded-xl"
                type="submit"
                disabled={isSubmitting}
              >
                <span className="grid size-5 place-items-center rounded-full bg-white font-extrabold text-[#4285f4]">
                  G
                </span>
                Continue with Google
              </LandingButton>
            </form>

            <div className="my-6 flex items-center gap-4 text-xs text-zinc-400">
              <span className="h-px flex-1 bg-zinc-200" />
              or continue with email
              <span className="h-px flex-1 bg-zinc-200" />
            </div>

            <form action={isLogin ? signInAction : signUpAction} onSubmit={() => setIsSubmitting(true)} className="space-y-4">
              {next ? <input type="hidden" name="next" value={next} /> : null}
              {!isLogin ? (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Full name</span>
                  <Input name="fullName" placeholder="POSKART Photobooth" required autoComplete="name" className="h-12 rounded-xl" />
                </label>
              ) : null}
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Email</span>
                <Input name="email" type="email" placeholder="admin@poskart.id" required autoComplete="email" className="h-12 rounded-xl" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Password</span>
                <span className="relative block">
                  <Input
                    name="password"
                    type={passwordVisible ? "text" : "password"}
                    placeholder="Minimum 8 characters"
                    required
                    minLength={8}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    className="h-12 rounded-xl pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible((visible) => !visible)}
                    aria-label={passwordVisible ? "Hide password" : "Show password"}
                    aria-pressed={passwordVisible}
                    className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                  >
                    {passwordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </span>
              </label>

              <LandingButton
                variant="primary"
                size="lg"
                className="h-12 w-full rounded-xl"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                {isSubmitting ? "Checking..." : isLogin ? "Sign in" : "Create account"}
              </LandingButton>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-500">
              {isLogin ? "Do not have an account?" : "Already have an account?"}{" "}
              <Link
                href={isLogin ? "/register" : "/login"}
                className="font-semibold text-[#014EB4] transition hover:text-[#00357B]"
              >
                {isLogin ? "Create one" : "Sign in"}
              </Link>
            </p>

            <p className="mt-8 text-center text-xs text-zinc-400">
              By continuing, you agree to use POSKART for your business operations.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
