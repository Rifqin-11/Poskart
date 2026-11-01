import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Mail,
  ShieldAlert,
  UsersRound,
} from "lucide-react";
import { createClient, getServiceRoleClient } from "@/lib/supabase/server";
import { LandingButton } from "@/components/ui/landing-button";
import { signOutAction } from "@/app/auth/actions";
import {
  acceptOrganizationInvitationAction,
  declineOrganizationInvitationAction,
  getOrganizationInvitationByToken,
} from "@/server/admin/actions/organization-invitation-actions";

export const metadata: Metadata = {
  title: "Workspace invitation | POSKART",
  robots: { index: false, follow: false },
};

type MembershipRow = {
  organization_id: string;
  role: string;
  organization: { name: string } | { name: string }[] | null;
};

function membershipName(organization: MembershipRow["organization"]) {
  return Array.isArray(organization)
    ? organization[0]?.name ?? "Current workspace"
    : organization?.name ?? "Current workspace";
}

function MessageBox({
  children,
  tone = "error",
}: {
  children: React.ReactNode;
  tone?: "error" | "info" | "success";
}) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-blue-100 bg-blue-50 text-blue-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  }[tone];

  return <div className={`rounded-2xl border p-4 text-sm leading-6 ${styles}`}>{children}</div>;
}

function InvitationShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#f5f6f8] px-4 py-8 text-zinc-950 sm:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-0 size-96 rounded-full bg-blue-100/70 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 bottom-0 size-[30rem] rounded-full bg-sky-100/60 blur-3xl" />
      <div className="relative w-full max-w-xl">
        <Link href="/" className="mx-auto mb-7 flex w-fit items-center gap-3">
          <span className="grid size-10 place-items-center overflow-hidden rounded-xl border border-white bg-white shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.webp" alt="POSKART" className="size-7 object-contain" />
          </span>
          <span>
            <span className="block text-sm font-bold tracking-[0.14em]">POSKART</span>
            <span className="block text-[10px] uppercase tracking-[0.16em] text-zinc-400">Photobooth OS</span>
          </span>
        </Link>
        <section className="rounded-[30px] border border-white/90 bg-white/65 p-2 shadow-[0_24px_70px_rgba(0,53,123,0.14)] backdrop-blur-xl">
          <div className="rounded-[24px] border border-white/80 bg-white/75 p-6 sm:p-8">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

export default async function OrganizationInvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error: actionError } = await searchParams;
  const invitation = await getOrganizationInvitationByToken(token);

  if (!invitation) {
    return (
      <InvitationShell>
        <div className="text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-50 text-red-600">
            <AlertTriangle className="size-6" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">Invitation not found</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-500">
            This invitation link is invalid or has already been removed. Ask the workspace admin to send a new invitation.
          </p>
          <Link href="/onboarding" className="mt-6 inline-flex text-sm font-semibold text-[#014EB4] hover:text-[#00357B]">
            Go to onboarding <ArrowRight className="ml-1.5 size-4" />
          </Link>
        </div>
      </InvitationShell>
    );
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  const invitePath = `/organization/invitations/${encodeURIComponent(token)}`;
  const loginPath = `/login?next=${encodeURIComponent(invitePath)}`;
  const registerPath = `/register?next=${encodeURIComponent(invitePath)}`;

  let memberships: MembershipRow[] = [];
  if (user) {
    const service = await getServiceRoleClient();
    const { data } = await service
      .from("organization_members")
      .select("organization_id,role,organization:organizations(name)")
      .eq("profile_id", user.id);
    memberships = (data ?? []) as unknown as MembershipRow[];
  }

  const emailMatches = user
    ? user.email?.trim().toLowerCase() === invitation.email.trim().toLowerCase()
    : false;
  const targetMembership = memberships.find(
    (membership) => membership.organization_id === invitation.organizationId,
  );
  const otherMemberships = memberships.filter(
    (membership) => membership.organization_id !== invitation.organizationId,
  );
  const ownerMembership = otherMemberships.find((membership) => membership.role === "owner");

  if (invitation.status !== "pending" || invitation.expired) {
    const statusText = invitation.expired
      ? "This invitation has expired."
      : invitation.status === "accepted"
        ? "This invitation has already been accepted."
        : "This invitation is no longer available.";
    return (
      <InvitationShell>
        <div className="text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-zinc-100 text-zinc-600">
            <Clock3 className="size-6" />
          </div>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">{invitation.organizationName}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Invitation unavailable</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-500">{statusText} Ask an admin to send another invitation.</p>
          {user ? (
            <Link href="/dashboard" className="mt-6 inline-flex text-sm font-semibold text-[#014EB4] hover:text-[#00357B]">
              Go to dashboard <ArrowRight className="ml-1.5 size-4" />
            </Link>
          ) : null}
        </div>
      </InvitationShell>
    );
  }

  return (
    <InvitationShell>
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-[#00357B]">
          <Mail className="size-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#014EB4]">Workspace invitation</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Join {invitation.organizationName}</h1>
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-zinc-600">
        You were invited to collaborate on this POSKART photobooth workspace. Review the invitation before joining.
      </p>

      <div className="mt-5 grid gap-3 rounded-2xl border border-zinc-200/80 bg-white/70 p-4 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-500">Invited email</span>
          <span className="truncate font-medium text-zinc-900">{invitation.email}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-500">Expires</span>
          <span className="font-medium text-zinc-900">
            {new Date(invitation.expiresAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
          </span>
        </div>
      </div>

      {actionError ? <div className="mt-5"><MessageBox>{actionError}</MessageBox></div> : null}

      {!user ? (
        <div className="mt-6 space-y-3">
          <MessageBox tone="info">Sign in or create an account with the invited email address to continue.</MessageBox>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href={loginPath} className="inline-flex h-11 items-center justify-center rounded-xl bg-[#00357B] px-4 text-sm font-semibold text-white transition hover:bg-[#014EB4]">
              Sign in <ArrowRight className="ml-2 size-4" />
            </Link>
            <Link href={registerPath} className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:border-[#014EB4] hover:text-[#00357B]">
              Create account
            </Link>
          </div>
        </div>
      ) : !emailMatches ? (
        <div className="mt-6 space-y-4">
          <MessageBox>
            This invitation was sent to <strong>{invitation.email}</strong>, but you are signed in as <strong>{user.email}</strong>. Sign in with the invited account to continue.
          </MessageBox>
          <form action={signOutAction}>
            <input type="hidden" name="next" value={invitePath} />
            <LandingButton type="submit" variant="secondary" size="md" className="w-full">
              Sign out and use another account
            </LandingButton>
          </form>
        </div>
      ) : ownerMembership ? (
        <div className="mt-6 space-y-4">
          <MessageBox>
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <span>You are an owner of <strong>{membershipName(ownerMembership.organization)}</strong>. Transfer ownership or delete that workspace before joining another one.</span>
            </div>
          </MessageBox>
          <form action={declineOrganizationInvitationAction}>
            <input type="hidden" name="token" value={token} />
            <LandingButton type="submit" variant="secondary" size="md" className="w-full">
              Decline invitation
            </LandingButton>
          </form>
        </div>
      ) : otherMemberships.length > 0 ? (
        <div className="mt-6 space-y-4">
          <MessageBox tone="info">
            <div className="flex items-start gap-2">
              <UsersRound className="mt-0.5 size-4 shrink-0" />
              <span>You currently belong to <strong>{otherMemberships.map((membership) => membershipName(membership.organization)).join(", ")}</strong>. Accepting this invitation will remove your access from the current workspace.</span>
            </div>
          </MessageBox>
          <form action={acceptOrganizationInvitationAction}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="mode" value="leave" />
            <LandingButton type="submit" variant="primary" size="md" className="w-full justify-between">
              Leave current workspace and join
              <ArrowRight className="size-4" />
            </LandingButton>
          </form>
          <form action={declineOrganizationInvitationAction}>
            <input type="hidden" name="token" value={token} />
            <LandingButton type="submit" variant="secondary" size="md" className="w-full">
              Keep current workspace
            </LandingButton>
          </form>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {targetMembership ? (
            <MessageBox tone="success">
              You already belong to this workspace. Accepting will confirm the invitation and take you to the dashboard.
            </MessageBox>
          ) : null}
          <form action={acceptOrganizationInvitationAction}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="mode" value="accept" />
            <LandingButton type="submit" variant="primary" size="md" className="w-full justify-between">
              Accept invitation
              <CheckCircle2 className="size-4" />
            </LandingButton>
          </form>
          <form action={declineOrganizationInvitationAction}>
            <input type="hidden" name="token" value={token} />
            <LandingButton type="submit" variant="secondary" size="md" className="w-full">
              Decline invitation
            </LandingButton>
          </form>
        </div>
      )}

      <p className="mt-6 text-center text-xs leading-5 text-zinc-400">
        This invitation is secure, single-use, and tied to the invited email address.
      </p>
    </InvitationShell>
  );
}
