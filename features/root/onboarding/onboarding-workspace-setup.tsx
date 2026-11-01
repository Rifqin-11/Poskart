import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  KeyRound,
  MonitorSmartphone,
  Plus,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import {
  createOrganizationAction,
  joinOrganizationAction,
} from "@/app/(admin)/onboarding/actions";
import { Input } from "@/components/ui/input";
import { OnboardingSubmitButton } from "@/features/root/onboarding/onboarding-submit-button";

type OnboardingWorkspaceSetupProps = {
  error?: string;
  success?: string;
};

const setupSteps = [
  {
    number: "01",
    title: "Choose your path",
    description: "Create a new workspace or join one with a code.",
  },
  {
    number: "02",
    title: "Prepare your booth",
    description: "Connect the Android tablet, then choose frames and pricing.",
  },
  {
    number: "03",
    title: "Start operating",
    description: "Activate a trial or subscription before serving customers.",
  },
];

export function OnboardingWorkspaceSetup({
  error,
  success,
}: OnboardingWorkspaceSetupProps) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#f5f6f8] px-4 py-6 text-zinc-950 sm:px-8 sm:py-10 lg:px-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-8 size-[28rem] rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute -right-40 top-[28rem] size-[32rem] rounded-full bg-sky-100/50 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(80%_100%_at_50%_0%,rgba(255,255,255,0.85),rgba(255,255,255,0))]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <header className="flex items-center justify-between border-b border-zinc-200/70 pb-5">
          <Link href="/" className="group flex items-center gap-3">
            <span className="grid size-10 place-items-center overflow-hidden rounded-xl border border-white bg-white shadow-[0_6px_18px_rgba(0,53,123,0.1)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.webp" alt="POSKART" className="size-7 object-contain" />
            </span>
            <span>
              <span className="block text-sm font-bold tracking-[0.14em] text-zinc-950">POSKART</span>
              <span className="block text-[10px] uppercase tracking-[0.16em] text-zinc-400 transition-colors group-hover:text-[#00357B]">
                Photobooth OS
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
            <span className="grid size-7 place-items-center rounded-lg bg-[#00357B] font-mono text-[10px] text-white shadow-[0_5px_14px_rgba(0,53,123,0.22)]">
              01
            </span>
            <span>Setup / 03</span>
          </div>
        </header>

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,0.82fr)] lg:items-center lg:gap-16">
          <section aria-labelledby="onboarding-title">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#00357B]">
              <span className="size-1.5 rounded-full bg-[#F5A3AE]" />
              Photobooth setup
            </p>
            <h1 id="onboarding-title" className="mt-5 max-w-xl text-5xl font-black leading-[0.98] tracking-[-0.055em] text-zinc-950 sm:text-6xl">
              Set up your photobooth workspace.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-zinc-600">
              Manage your booth devices, frames, pricing, transactions, and team access from one workspace.
            </p>

            <div className="relative mt-10 max-w-md">
              <div aria-hidden="true" className="absolute bottom-5 left-4 top-5 w-px bg-gradient-to-b from-[#00357B] via-blue-200 to-zinc-200" />
              <div className="space-y-6">
                {setupSteps.map((step, index) => (
                  <div key={step.number} className="relative flex gap-4">
                    <div className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-xl border text-[10px] font-bold ${index === 0 ? "border-[#00357B] bg-[#00357B] text-white shadow-[0_6px_16px_rgba(0,53,123,0.2)]" : "border-white bg-white/80 text-zinc-400 shadow-sm"}`}>
                      {index === 0 ? <Check className="size-3.5" /> : step.number}
                    </div>
                    <div className="pt-0.5">
                      <h2 className="text-sm font-semibold text-zinc-950">{step.title}</h2>
                      <p className="mt-1 max-w-sm text-xs leading-5 text-zinc-500">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 flex max-w-lg items-start gap-3 border-t border-zinc-200/80 pt-5 text-xs leading-5 text-zinc-500">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-[#014EB4]" />
              <p>
                You can explore and configure a free workspace first. A trial or subscription is only needed when you start pairing and operating devices.
              </p>
            </div>
          </section>

          <section
            aria-labelledby="choose-path-title"
            className="relative rounded-[32px] border border-white/90 bg-white/45 p-2 shadow-[0_24px_70px_rgba(0,53,123,0.14)] backdrop-blur-2xl"
          >
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-0 h-20 rounded-full bg-white/70 blur-2xl" />
            <div className="relative rounded-[26px] border border-white/80 bg-white/72 p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#00357B]">Choose your path</p>
                  <h2 id="choose-path-title" className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">How will you use POSKART?</h2>
                </div>
                <div className="hidden size-10 place-items-center rounded-2xl border border-white bg-white/70 text-[#00357B] shadow-sm sm:grid">
                  <MonitorSmartphone className="size-5" />
                </div>
              </div>

              {error ? (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50/90 p-3.5 text-sm leading-5 text-red-700" role="alert" aria-live="assertive">
                  {error}
                </div>
              ) : null}
              {success ? (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-sm leading-5 text-emerald-700" role="status" aria-live="polite">
                  {success}
                </div>
              ) : null}

              <div className="mt-6 rounded-2xl border border-blue-100/80 bg-[#f2f6ff]/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/90 text-[#00357B] shadow-sm">
                    <Plus className="size-4" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-zinc-950">Create a workspace</h3>
                      <span className="rounded-md bg-white/80 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#00357B]">For owners</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">Start a new photobooth business or venue workspace.</p>
                  </div>
                </div>
                <form action={createOrganizationAction} className="relative mt-4 space-y-3">
                  <label className="block text-xs font-medium text-zinc-600">
                    Workspace name
                    <Input
                      className="mt-1.5 h-12 rounded-xl border-white/90 bg-white/85 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)]"
                      name="organizationName"
                      placeholder="Mango Booth Bandung"
                      required
                    />
                    <span className="mt-1.5 block text-[11px] font-normal leading-4 text-zinc-400">Use your business, brand, or venue name.</span>
                  </label>
                  <OnboardingSubmitButton pendingLabel="Creating workspace...">
                    Create workspace
                    <ArrowRight className="size-4" />
                  </OnboardingSubmitButton>
                </form>
              </div>

              <div className="my-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                <span className="h-px flex-1 bg-zinc-200/80" />
                or
                <span className="h-px flex-1 bg-zinc-200/80" />
              </div>

              <div className="rounded-2xl border border-white/90 bg-white/55 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-zinc-100/90 text-zinc-700 shadow-sm">
                    <KeyRound className="size-4" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-zinc-950">Join with a code</h3>
                      <span className="rounded-md bg-zinc-100/90 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-500">For team members</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">Join a workspace that already exists.</p>
                  </div>
                </div>
                <form action={joinOrganizationAction} className="relative mt-4 space-y-3">
                  <label className="block text-xs font-medium text-zinc-600">
                    Workspace join code
                    <Input
                      className="mt-1.5 h-12 rounded-xl border-white/90 bg-white/75 font-mono uppercase tracking-[0.2em] shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)]"
                      name="organizationCode"
                      placeholder="A1B2C3D4"
                      required
                    />
                    <span className="mt-1.5 block text-[11px] font-normal leading-4 text-zinc-400">Ask the owner for this code. It is different from the tablet pairing code.</span>
                  </label>
                  <OnboardingSubmitButton pendingLabel="Sending join request..." variant="secondary">
                    Request to join
                    <UsersRound className="size-4" />
                  </OnboardingSubmitButton>
                </form>
              </div>
            </div>
          </section>
        </div>

        <section aria-labelledby="before-operating-title" className="mt-14 border-t border-zinc-200/80 py-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Before your first session</p>
              <h2 id="before-operating-title" className="mt-2 text-xl font-bold tracking-tight text-zinc-950">A little preparation goes a long way.</h2>
            </div>
            <div className="grid max-w-2xl flex-1 gap-5 sm:grid-cols-2 sm:gap-8">
              <div className="flex gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-white/80 text-[#00357B] shadow-sm ring-1 ring-zinc-200/70">
                  <UserRound className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-950">Creating the workspace</h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">You become the owner, invite staff, and configure your devices when ready.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-white/80 text-[#00357B] shadow-sm ring-1 ring-zinc-200/70">
                  <UsersRound className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-950">Joining a workspace</h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">Your request is reviewed by the owner or admin before access is granted.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 flex items-start gap-2 text-xs leading-5 text-zinc-500">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <p>The workspace can be explored for free. A trial or subscription is required to pair and operate a live device.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
