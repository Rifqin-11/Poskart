"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CreditCard,
  KeyRound,
  LockKeyhole,
  MailPlus,
  Landmark,
  ShieldCheck,
  Store,
  Timer,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SubscriptionDialog } from "@/features/billing/subscription/subscription-dialog";
import { AddMemberDialog } from "@/features/admin/organization/_components/add-member-dialog";
import {
  useDeleteInvitation,
  useInviteUser,
  useRemoveMember,
  useTenantDetails,
  useTenantInvitations,
  useTenantMembers,
  useUpdateTenantName,
} from "@/features/admin/organization/use-organization";
import {
  SettingsCard,
  SettingsPanelBlock,
} from "./settings-card";
import { PayoutAccountForm } from "@/features/admin/payout/payout-account-form";
import { getMyPayoutSummary } from "@/server/admin/actions/payout-actions";
import type { PayoutAccount } from "@/types/payout";

type OrganizationCardProps = {
  myEmail: string;
  subscriptionRequired: boolean;
};

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

function formatDate(value?: string | null) {
  if (!value) return "Not active";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function OrganizationMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-3xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
        {icon}
        {label}
      </div>
      <div className="mt-2 truncate text-sm font-semibold text-zinc-950">
        {value}
      </div>
    </div>
  );
}

export function OrganizationCard({
  myEmail,
  subscriptionRequired,
}: OrganizationCardProps) {
  const { data: tenant, isLoading: isLoadingTenant } = useTenantDetails();
  const { data: members = [] } = useTenantMembers();
  const { data: invitations = [] } = useTenantInvitations();
  const updateName = useUpdateTenantName();
  const inviteUser = useInviteUser();
  const deleteInvitation = useDeleteInvitation();
  const removeMember = useRemoveMember();
  const confirmRemove = useConfirmDialog();

  const [editedName, setEditedName] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] =
    useState(subscriptionRequired);
  const [payoutAccount, setPayoutAccount] = useState<PayoutAccount | null>(
    null,
  );

  const loadPayoutAccount = useCallback(() => {
    getMyPayoutSummary()
      .then((summary) => setPayoutAccount(summary.payoutAccount))
      .catch(() => {
        // Payout settings are non-critical for the organization settings page.
      });
  }, []);

  useEffect(() => {
    loadPayoutAccount();
  }, [loadPayoutAccount]);

  const organizationName = editedName ?? tenant?.name ?? "";
  const planName = tenant?.plan_name ?? "Free organization";
  const subscriptionStatus = tenant?.subscription_status ?? "free";
  const subscriptionActive = Boolean(tenant?.subscription_is_active);
  const isFreeAccount = !subscriptionActive || subscriptionStatus === "free";
  const deviceLimit = tenant?.device_limit ?? 1;
  const joinCode = tenant?.join_code ?? "Pending";
  const memberRows = members as OrganizationMemberRow[];
  const invitationRows = invitations as OrganizationInvitationRow[];

  return (
    <div className="space-y-8">
      {confirmRemove.dialog}
      {subscriptionRequired || isFreeAccount ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700">
              <LockKeyhole className="size-4" />
            </div>
            <div>
              <div className="font-semibold">
                {subscriptionRequired
                  ? "Active subscription required"
                  : "Workspace is on free plan"}
              </div>
              <p className="mt-1 leading-6">
                Aktifkan subscription untuk membuka builder, themes, templates,
                devices, transactions, gallery, dan settings operasional lain.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <SettingsCard
        icon={<Building2 className="size-4" />}
        title="Workspace"
        description="Identitas organisasi, join code, dan status akses workspace."
      >
        <div className="space-y-4">
          <SettingsPanelBlock className="bg-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">
                  Organization name
                </div>
                <div className="mt-2 truncate text-2xl font-semibold text-zinc-950">
                  {isLoadingTenant
                    ? "Loading organization..."
                    : tenant?.name ?? "POSKART Workspace"}
                </div>
              </div>
              <Badge
                variant={subscriptionActive ? "default" : "secondary"}
                className="capitalize"
              >
                {subscriptionActive ? "active" : subscriptionStatus}
              </Badge>
            </div>
          </SettingsPanelBlock>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="block text-xs font-medium text-zinc-600">
              Edit organization name
              <Input
                className="mt-1.5"
                value={organizationName}
                onChange={(event) => setEditedName(event.target.value)}
                placeholder="POSKART Admin"
              />
            </label>
            <Button
              className="self-end rounded-2xl"
              disabled={
                !organizationName.trim() ||
                organizationName === tenant?.name ||
                updateName.isPending
              }
              onClick={() => {
                updateName.mutate(organizationName.trim(), {
                  onSuccess: () => {
                    toast.success("Organization name updated");
                    setEditedName(null);
                  },
                  onError: (err) =>
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : "Failed to update organization",
                    ),
                });
              }}
            >
              {updateName.isPending ? "Saving..." : "Save name"}
            </Button>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-zinc-50/70 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
              <KeyRound className="size-3.5" />
              Organization join code
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="inline-flex w-fit rounded-2xl border border-zinc-200 bg-white px-4 py-2 font-mono text-sm font-semibold tracking-[0.24em] text-zinc-950">
                {joinCode}
              </div>
              <p className="text-xs leading-5 text-zinc-500">
                Bagikan code ini ke staff agar mereka bisa join workspace saat
                onboarding.
              </p>
            </div>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        icon={<CreditCard className="size-4" />}
        title="Subscription"
        description="Ringkasan plan, status, limit perangkat, dan masa aktif organisasi."
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <OrganizationMetric
              icon={<CreditCard className="size-3.5" />}
              label="Plan"
              value={planName}
            />
            <OrganizationMetric
              icon={<ShieldCheck className="size-3.5" />}
              label="Status"
              value={
                <span className="capitalize">
                  {subscriptionActive ? "active" : subscriptionStatus}
                </span>
              }
            />
            <OrganizationMetric
              icon={<Store className="size-3.5" />}
              label="Device limit"
              value={`${deviceLimit} device${deviceLimit > 1 ? "s" : ""}`}
            />
            <OrganizationMetric
              icon={<Timer className="size-3.5" />}
              label="Expiry"
              value={formatDate(tenant?.subscription_expires_at)}
            />
          </div>
          <Button
            type="button"
            className="w-full rounded-2xl"
            onClick={() => setSubscriptionDialogOpen(true)}
          >
            {isFreeAccount ? "View subscription plans" : "Manage billing"}
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard
        icon={<Landmark className="size-4" />}
        title="Payout account"
        description="Rekening tujuan pencairan hasil photobooth dari payment gateway POSKART."
      >
        <PayoutAccountForm
          account={payoutAccount}
          compact
          onSaved={loadPayoutAccount}
        />
      </SettingsCard>

      <SettingsCard
        icon={<UserRound className="size-4" />}
        title="Team"
        description="Kelola member dan invitation yang memiliki akses ke workspace."
        className="border-b-0 pb-0"
      >
        <div className="space-y-5">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={() => setInviteDialogOpen(true)}
            >
              <MailPlus className="size-4" />
              Invite member
            </Button>
          </div>

          <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined At</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberRows.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.email}
                      {member.email === myEmail ? (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          You
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          member.role === "admin" ? "warning" : "secondary"
                        }
                      >
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {formatDate(member.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-zinc-500 hover:bg-red-50 hover:text-red-600"
                        disabled={member.email === myEmail}
                        onClick={() => {
                          confirmRemove.confirm({
                            title: "Remove member?",
                            description: `Remove ${member.email} from organization?`,
                            confirmLabel: "Remove",
                            destructive: true,
                            onConfirm: () => {
                              removeMember.mutate(member.id, {
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
                        <Trash2 className="size-4" />
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!memberRows.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-8 text-center text-sm text-zinc-500"
                    >
                      No members found.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          {invitationRows.length ? (
            <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-950">
                Pending invitations
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Invited At</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitationRows.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">
                        {invitation.email}
                      </TableCell>
                      <TableCell className="text-zinc-500">
                        {formatDate(invitation.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-zinc-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => {
                            deleteInvitation.mutate(invitation.id, {
                              onSuccess: () =>
                                toast.success("Invitation cancelled"),
                              onError: (err) =>
                                toast.error(
                                  err instanceof Error
                                    ? err.message
                                    : "Failed to cancel invitation",
                                ),
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
          ) : null}
        </div>
      </SettingsCard>

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
