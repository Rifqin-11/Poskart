import { Building2, KeyRound, Plus, UsersRound } from "lucide-react";
import { redirect } from "next/navigation";
import {
  createOrganizationAction,
  joinOrganizationAction,
} from "@/app/(admin)/onboarding/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-8">
      <div className="max-w-2xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
          <Building2 className="size-3.5 text-red-500" />
          Workspace setup
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Create or join your POSKART organization.
        </h1>
        <p className="mt-3 text-sm leading-7 text-zinc-600">
          POSKART is organization-based. Before using dashboard data, themes,
          templates, devices, and analytics, connect this account to a
          workspace.
        </p>
      </div>

      {params.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {params.error}
        </div>
      ) : null}
      {params.success ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          {params.success}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="mb-3 grid size-10 place-items-center rounded-lg bg-zinc-100">
              <Plus className="size-5 text-zinc-700" />
            </div>
            <CardTitle>Create organization</CardTitle>
            <CardDescription>
              Start a new POSKART workspace and become its owner.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createOrganizationAction} className="space-y-4">
              <label className="block text-xs font-medium text-zinc-500">
                Organization name
                <Input
                  className="mt-1"
                  name="organizationName"
                  placeholder="POSKART Bandung"
                  required
                />
              </label>
              <Button type="submit" className="w-full" size="lg">
                Create organization
                <Building2 className="size-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-3 grid size-10 place-items-center rounded-lg bg-zinc-100">
              <KeyRound className="size-5 text-zinc-700" />
            </div>
            <CardTitle>Join organization</CardTitle>
            <CardDescription>
              Enter the unique organization code from your workspace owner.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={joinOrganizationAction} className="space-y-4">
              <label className="block text-xs font-medium text-zinc-500">
                Organization code
                <Input
                  className="mt-1 font-mono uppercase tracking-[0.2em]"
                  name="organizationCode"
                  placeholder="A1B2C3D4"
                  required
                />
              </label>
              <Button type="submit" className="w-full" size="lg" variant="outline">
                Join organization
                <UsersRound className="size-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-600">
        Organization owners can find the join code later on the Organization
        Management page. Free organizations can view dashboard and organization
        settings, while operating tools unlock after subscription activation.
      </div>
    </div>
  );
}
