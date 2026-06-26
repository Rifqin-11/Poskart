"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  CreditCard,
  LockKeyhole,
  ShieldCheck,
  Store,
  Timer,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/features/admin/_components/page-header";
import { SubscriptionDialog } from "@/features/billing/subscription/subscription-dialog";
import {
  useDeleteInvitation,
  useInviteUser,
  useRemoveMember,
  useTenantDetails,
  useTenantInvitations,
  useTenantMembers,
  useUpdateTenantName,
} from "@/features/admin/organization/use-organization";
import { createClient } from "@/lib/supabase/client";

import { AddMemberDialog } from "./_components/add-member-dialog";

type OrganizationMemberRow = {
  id: string;
  email: string;
  role: string;
  created_at: string;
};

type OrganizationInvitationRow = {
  id: string;
  email: string;
  created_at: string;
};

export function OrganizationPanel() {
  const searchParams = useSearchParams();
  const subscriptionRequired = searchParams.get("subscription") === "required";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Management"
        description="Manage your subscription plan, organization details, and team members."
      />
      <OrganizationSettings subscriptionRequired={subscriptionRequired} />
    </div>
  );
}

function OrganizationSettings({
  subscriptionRequired,
}: {
  subscriptionRequired: boolean;
}) {
  const { data: tenant, isLoading: isLoadingTenant } = useTenantDetails();
  const { data: members = [] } = useTenantMembers();
  const { data: invitations = [] } = useTenantInvitations();

  const updateName = useUpdateTenantName();
  const inviteUser = useInviteUser();
  const deleteInvitation = useDeleteInvitation();
  const removeMember = useRemoveMember();

  const [editedName, setEditedName] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [myEmail, setMyEmail] = useState("");
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] =
    useState(subscriptionRequired);
  const confirmRemove = useConfirmDialog();

  const supabase = createClient();
  useEffect(() => {
    supabase.auth
      .getUser()
      .then((res: { data: { user: { email?: string | null } | null } }) => {
        if (res.data?.user?.email) setMyEmail(res.data.user.email);
      });
  }, [supabase]);

  if (isLoadingTenant)
    return (
      <div className="p-8 text-center text-zinc-500">
        Loading organization details...
      </div>
    );

  const organizationName = editedName ?? tenant?.name ?? "";
  const planName = tenant?.plan_name ?? "Free organization";
  const subscriptionStatus = tenant?.subscription_status ?? "free";
  const expiresAt = tenant?.subscription_expires_at
    ? new Date(tenant.subscription_expires_at)
    : null;
  const isFreeAccount =
    subscriptionStatus === "free" || !tenant?.subscription_is_active;
  const deviceLimit = tenant?.device_limit ?? 1;

  return (
    <div className="space-y-6">
      {confirmRemove.dialog}
      {subscriptionRequired ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 size-4 shrink-0" />
            <div>
              <div className="font-semibold">Active subscription required</div>
              <p className="mt-1 leading-6">
                Theme, builder, template, devices, analytics, settings, and
                transaction tools are locked while this organization is on a
                free organization plan.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <CardContent className="grid gap-0 p-0 lg:grid-cols-[1fr_380px]">
          <div className="p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge variant={isFreeAccount ? "warning" : "success"}>
                {isFreeAccount ? "Free organization" : "Active subscription"}
              </Badge>
              <Badge variant="secondary">
                {deviceLimit} device{deviceLimit > 1 ? "s" : ""} allowed
              </Badge>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950">
              {organizationName || "POSKART Workspace"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600">
              Manage workspace identity, subscription access, and team
              permissions from one place.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setSubscriptionDialogOpen(true)}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
              >
                <CreditCard className="size-4" />
                {isFreeAccount ? "View subscription plans" : "Manage billing"}
              </button>
              <div className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-600">
                Join code
                <span className="font-mono font-semibold tracking-[0.2em] text-zinc-950">
                  {tenant?.join_code ?? "PENDING"}
                </span>
              </div>
            </div>
          </div>
          <div className="grid gap-3 border-t border-zinc-200 bg-zinc-50 p-5 sm:grid-cols-2 lg:border-l lg:border-t-0">
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <CreditCard className="mb-3 size-4 text-zinc-500" />
              <div className="text-xs text-zinc-500">Plan</div>
              <div className="mt-1 text-sm font-semibold text-zinc-950">
                {planName}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <ShieldCheck className="mb-3 size-4 text-zinc-500" />
              <div className="text-xs text-zinc-500">Status</div>
              <div className="mt-1 text-sm font-semibold capitalize text-zinc-950">
                {subscriptionStatus}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <Store className="mb-3 size-4 text-zinc-500" />
              <div className="text-xs text-zinc-500">Device limit</div>
              <div className="mt-1 text-sm font-semibold text-zinc-950">
                {deviceLimit} device{deviceLimit > 1 ? "s" : ""}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <Timer className="mb-3 size-4 text-zinc-500" />
              <div className="text-xs text-zinc-500">Expiry</div>
              <div className="mt-1 text-sm font-semibold text-zinc-950">
                {expiresAt ? expiresAt.toLocaleDateString() : "Not active"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-6 p-5 lg:grid-cols-[1fr_280px]">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>Workspace settings</CardTitle>
                <CardDescription className="mt-1">
                  Update organization identity and keep the join code ready for
                  staff onboarding.
                </CardDescription>
              </div>
            </div>

            <div className="mt-6 flex max-w-xl items-end gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-zinc-500">
                  Organization Name
                </label>
                <Input
                  value={organizationName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="My Organization"
                />
              </div>
              <Button
                disabled={
                  !organizationName.trim() ||
                  organizationName === tenant?.name ||
                  updateName.isPending
                }
                onClick={() => {
                  updateName.mutate(organizationName, {
                    onSuccess: () => {
                      toast.success("Organization name updated");
                      setEditedName(null);
                    },
                    onError: (err) =>
                      toast.error(
                        err instanceof Error
                          ? err.message
                          : "Failed to update name",
                      ),
                  });
                }}
              >
                {updateName.isPending ? "Saving..." : "Save"}
              </Button>
            </div>

            <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-3">
              <div className="text-xs font-medium text-zinc-500">
                Organization join code
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm font-semibold tracking-[0.24em] text-zinc-950">
                  {tenant?.join_code ?? "Pending"}
                </div>
                <div className="text-xs leading-5 text-zinc-500">
                  Share this code with staff so they can join this workspace
                  during onboarding.
                </div>
              </div>
            </div>
          </div>

          <div
            className={
              isFreeAccount
                ? "rounded-lg border border-amber-200 bg-amber-50 p-4"
                : "rounded-lg border border-zinc-200 bg-zinc-50 p-4"
            }
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              {isFreeAccount ? (
                <LockKeyhole className="size-4 text-amber-700" />
              ) : (
                <ShieldCheck className="size-4 text-emerald-700" />
              )}
              {isFreeAccount ? "Workspace locked" : "Workspace active"}
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              {isFreeAccount
                ? "Free organization can view dashboard and organization settings only. Activate a subscription to unlock builder, themes, templates, devices, analytics, transactions, and settings."
                : "This organization can use the POSKART operating tools according to the active subscription and paid device limit."}
            </p>
            <button
              type="button"
              onClick={() => setSubscriptionDialogOpen(true)}
              className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-zinc-950 px-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              {isFreeAccount ? "View subscription plans" : "Manage billing"}
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                People with access to this organization.
              </CardDescription>
            </div>
            <Button
              className="flex items-center gap-1.5"
              onClick={() => setInviteDialogOpen(true)}
            >
              <UserPlus className="size-4" /> Invite member
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Email</TableHead>
                <TableHead>System Role</TableHead>
                <TableHead>Joined At</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(members as OrganizationMemberRow[]).map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    {m.email}
                    {m.email === myEmail && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        You
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={m.role === "admin" ? "warning" : "secondary"}
                    >
                      {m.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-500">
                    {new Date(m.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={m.email === myEmail}
                      onClick={() => {
                        confirmRemove.confirm({
                          title: "Remove member?",
                          description: `Remove ${m.email} from organization?`,
                          confirmLabel: "Remove",
                          destructive: true,
                          onConfirm: () => {
                            removeMember.mutate(m.id, {
                              onSuccess: () => toast.success("Member removed"),
                              onError: (err) =>
                                toast.error(
                                  err instanceof Error
                                    ? err.message
                                    : "Failed to remove member",
                                ),
                            });
                          },
                        });
                      }}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {members.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-zinc-500 py-6"
                  >
                    No members found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {invitations.length > 0 && (
            <div className="pt-4 mt-4 border-t border-zinc-100">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Invited At</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(invitations as OrganizationInvitationRow[]).map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium text-zinc-600">
                        {inv.email}
                      </TableCell>
                      <TableCell className="text-zinc-500">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            deleteInvitation.mutate(inv.id, {
                              onSuccess: () =>
                                toast.success("Invitation cancelled"),
                            });
                          }}
                        >
                          Cancel
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <SubscriptionDialog
        open={subscriptionDialogOpen}
        onOpenChange={setSubscriptionDialogOpen}
      />
      <AddMemberDialog
        open={inviteDialogOpen}
        submitting={inviteUser.isPending}
        myEmail={myEmail}
        onClose={() => setInviteDialogOpen(false)}
        onSubmit={(email) => {
          inviteUser.mutate(email, {
            onSuccess: () => {
              toast.success(`Invitation sent to ${email}`);
              setInviteDialogOpen(false);
            },
            onError: (err) =>
              toast.error(
                err instanceof Error ? err.message : "Failed to invite user",
              ),
          });
        }}
      />
    </div>
  );
}
