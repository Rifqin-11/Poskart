import type { Metadata } from "next";
import { UsersRound } from "lucide-react";
import { redirect } from "next/navigation";
import {
  cancelMyPendingRequestAction,
} from "@/app/(admin)/onboarding/actions";
import { LandingButton } from "@/components/ui/landing-button";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWorkspaceSetup } from "@/features/root/onboarding/onboarding-workspace-setup";

export const metadata: Metadata = {
  title: "Onboarding | POSKART",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", data.user.id)
    .limit(1)
    .maybeSingle();

  if (membership?.organization_id) {
    redirect("/dashboard");
  }

  const { data: pendingRequest } = await supabase
    .from("organization_join_requests")
    .select(
      `
      id,
      status,
      created_at,
      organization:organizations(name)
    `,
    )
    .eq("profile_id", data.user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (pendingRequest) {
    const pendingOrganization = pendingRequest.organization as
      | { name?: string | null }
      | { name?: string | null }[]
      | null;
    const organization = Array.isArray(pendingOrganization)
      ? pendingOrganization[0]
      : pendingOrganization;
    const organizationName = organization?.name ?? "this workspace";

    return (
      <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#f5f6f8] p-4 text-zinc-950 sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-12 size-72 rounded-full bg-amber-100/70 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 size-96 rounded-full bg-blue-100/60 blur-3xl" />
        <div className="relative w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-amber-100/70 shadow-[0_10px_30px_rgba(245,158,11,0.12)] ring-1 ring-amber-200/70">
              <UsersRound className="size-6 text-amber-600" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Photobooth workspace</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
              Your join request is pending
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              The owner or an admin of <strong className="font-medium text-zinc-900">{organizationName}</strong> needs to approve your request before you can open the workspace.
            </p>
          </div>

          {params.error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 shadow-sm" role="alert">
              {params.error}
            </div>
          ) : null}
          {params.success ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700 shadow-sm" role="status">
              {params.success}
            </div>
          ) : null}

          <section className="rounded-[28px] border border-white/90 bg-white/65 p-2 shadow-[0_24px_70px_rgba(0,53,123,0.12)] backdrop-blur-xl">
            <div className="rounded-[22px] border border-white/80 bg-white/70 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 border-b border-zinc-200/70 pb-4">
                <span className="text-sm font-medium text-zinc-700">Join request status</span>
                <span className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  Waiting for approval
                </span>
              </div>
              <div className="pt-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">Submitted on</p>
                <p className="mt-1 text-sm font-medium text-zinc-900">
                  {new Date(pendingRequest.created_at).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-3 text-xs leading-5 text-blue-900">
                  Once approved, you can open the dashboard and see the devices, frames, pricing, and settings shared by this workspace.
                </div>
                <form action={cancelMyPendingRequestAction} className="mt-5">
                  <input type="hidden" name="requestId" value={pendingRequest.id} />
                  <LandingButton
                    type="submit"
                    variant="secondary"
                    size="sm"
                    className="w-full text-zinc-600 hover:bg-red-50 hover:text-red-700"
                  >
                    Cancel request
                  </LandingButton>
                </form>
              </div>
            </div>
          </section>

          <p className="text-center text-xs leading-relaxed text-zinc-400">
            Need to join a different workspace? <br />
            Cancel this request first, then enter another join code.
          </p>
        </div>
      </main>
    );
  }

  return <OnboardingWorkspaceSetup error={params.error} success={params.success} />;
}
