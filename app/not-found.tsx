import Link from "next/link";
import { ArrowLeft, Gauge, LifeBuoy } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#f5f6f8] px-5 py-8 text-zinc-950 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <section className="w-full overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="flex min-h-[520px] flex-col justify-between p-8 sm:p-10 lg:p-12">
              <div>
                <Link href="/" className="inline-flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-2xl border border-zinc-200 bg-white shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/Logo Poskart.png"
                      alt="POSKART Logo"
                      className="size-7 object-contain"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-950">POSKART</div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-400">
                      Photobooth OS
                    </div>
                  </div>
                </Link>

                <div className="mt-16 max-w-xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-400">
                    404 / Not Found
                  </p>
                  <h1 className="mt-5 text-4xl font-semibold leading-tight text-zinc-950 sm:text-5xl">
                    Page not found.
                  </h1>
                  <p className="mt-5 text-base leading-7 text-zinc-500 sm:text-lg">
                    The page may have moved, expired, or never existed. You can
                    return to POSKART or open the dashboard from here.
                  </p>
                </div>
              </div>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard"
                  className={buttonVariants({
                    size: "lg",
                    className: "h-12 rounded-full px-6",
                  })}
                >
                  <Gauge className="size-4" />
                  Go to dashboard
                </Link>
                <Link
                  href="/"
                  className={buttonVariants({
                    variant: "outline",
                    size: "lg",
                    className: "h-12 rounded-full px-6",
                  })}
                >
                  <ArrowLeft className="size-4" />
                  Back to home
                </Link>
                <Link
                  href="/contact"
                  className={buttonVariants({
                    variant: "ghost",
                    size: "lg",
                    className: "h-12 rounded-full px-6",
                  })}
                >
                  <LifeBuoy className="size-4" />
                  Contact support
                </Link>
              </div>
            </div>

            <div className="relative hidden min-h-[520px] border-l border-zinc-100 bg-zinc-50 lg:block">
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.95),transparent_28%),linear-gradient(135deg,rgba(24,24,27,0.03)_0_25%,transparent_25%_50%,rgba(24,24,27,0.03)_50%_75%,transparent_75%)] bg-[length:auto,34px_34px]"
              />
              <div className="relative flex h-full items-center justify-center p-12">
                <div className="w-full max-w-md rounded-[28px] border border-zinc-200 bg-white p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
                  <div className="grid aspect-[4/3] place-items-center rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50">
                    <span className="select-none text-[clamp(5rem,11vw,10rem)] font-semibold leading-none text-zinc-200">
                      404
                    </span>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-5">
                    <div>
                      <div className="text-sm font-semibold text-zinc-950">
                        Route unavailable
                      </div>
                      <div className="mt-1 text-sm text-zinc-500">
                        Check the URL or continue from the dashboard.
                      </div>
                    </div>
                    <div className="grid size-10 place-items-center rounded-full bg-zinc-950 text-xs font-semibold text-white">
                      PK
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
