"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
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
  Copy,
  Check,
  LogOut,
  PanelsTopLeft,
  Calculator,
} from "lucide-react";
import { showErrorToast, toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  useDeleteMyOrganization,
  useInviteUser,
  useRemoveMember,
  useTenantDetails,
  useTenantInvitations,
  useTenantMembers,
  useUpdateTenantName,
  useUpdateOrganizationFeatures,
  useLeaveOrganization,
  useTransferOwnership,
  useUpdateMemberRole,
  usePendingJoinRequests,
  useAcceptJoinRequest,
  useRejectJoinRequest,
} from "@/features/admin/organization/use-organization";
import {
  SettingsCard,
  SettingsPanelBlock,
} from "./settings-card";
import { PayoutAccountForm } from "@/features/admin/payout/payout-account-form";
import { Select } from "@/components/ui/select";
import { getMyPayoutSummary } from "@/server/admin/actions/payout-actions";
import type { PayoutAccount } from "@/types/payout";
import { OrganizationDeleteDialog } from "./organization-delete-dialog";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn } from "@/lib/utils";

type OrganizationCardProps = {
  myEmail: string;
  subscriptionRequired: boolean;
  isEditing: boolean;
  editSection?: "workspace" | "payout" | "team";
};

type OrganizationMemberRow = {
  id: string;
  email: string;
  role: string;
  created_at: string;
  profile_id?: string;
};

type OrganizationInvitationRow = {
  id: string;
  email: string;
  created_at: string;
};

type OrganizationJoinRequestRow = {
  id: string;
  created_at: string;
  profile: {
    id: string;
    email: string;
  };
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
    <div className="min-w-0 rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 truncate text-sm font-semibold text-zinc-950">
        {value}
      </div>
    </div>
  );
}

export function OrganizationCard({
  myEmail,
  subscriptionRequired,
  isEditing,
  editSection = "workspace",
}: OrganizationCardProps) {
  const { t } = useI18n();
  const { data: tenant, isLoading: isLoadingTenant } = useTenantDetails();
  const { data: members = [] } = useTenantMembers();
  const { data: invitations = [] } = useTenantInvitations();
  const updateName = useUpdateTenantName();
  const updateFeatures = useUpdateOrganizationFeatures();
  const inviteUser = useInviteUser();
  const deleteInvitation = useDeleteInvitation();
  const deleteMyOrganization = useDeleteMyOrganization();
  const removeMember = useRemoveMember();
  const leaveOrg = useLeaveOrganization();
  const transferOwnership = useTransferOwnership();
  const updateMemberRole = useUpdateMemberRole();
  const { data: pendingRequests = [] } = usePendingJoinRequests();
  const acceptJoinRequest = useAcceptJoinRequest();
  const rejectJoinRequest = useRejectJoinRequest();
  
  const confirmRemove = useConfirmDialog();
  const confirmTransfer = useConfirmDialog();
  const confirmLeave = useConfirmDialog();

  const [editedName, setEditedName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] =
    useState(subscriptionRequired);
  const [payoutAccount, setPayoutAccount] = useState<PayoutAccount | null>(
    null,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
  const requestRows = pendingRequests as OrganizationJoinRequestRow[];

  const currentMember = memberRows.find((m) => m.email === myEmail);
  const myRole = currentMember?.role ?? "partner";

  const isOwner = myRole === "owner";
  const isAdmin = myRole === "admin";
  const canManageTeam = isOwner || isAdmin;
  const canEditDetails = isOwner || isAdmin;
  const canViewPayout = isOwner;
  const canViewSubscription = isOwner;
  const showWorkspace = !isEditing || editSection === "workspace";
  const showPayout = !isEditing || editSection === "payout";
  const showTeam = !isEditing || editSection === "team";

  return (
    <div className="space-y-0">
      {confirmRemove.dialog}
      {confirmTransfer.dialog}
      {confirmLeave.dialog}
      {!isEditing && (subscriptionRequired || isFreeAccount) ? (
        <div className="mb-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
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

      {showWorkspace ? (
        <SettingsCard
          icon={<Building2 className="size-4" />}
          title="Workspace"
          description={t("settings.orgIdentityDesc")}
        >
          <div className="space-y-4">
            <SettingsPanelBlock className="bg-zinc-50/40">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">
                    Organization name
                  </div>
                  <div className="mt-1.5 truncate text-xl font-semibold text-zinc-950 sm:text-2xl">
                    {isLoadingTenant
                      ? "Loading organization..."
                      : tenant?.name ?? "POSKART Workspace"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={subscriptionActive ? "default" : "secondary"}
                    className="capitalize"
                  >
                    {subscriptionActive ? "active" : subscriptionStatus}
                  </Badge>
                </div>
              </div>
            </SettingsPanelBlock>

            {isEditing && canEditDetails && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <label className="block text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                    Edit organization name
                    <Input
                      className="mt-1.5"
                      value={organizationName}
                      onChange={(event) => setEditedName(event.target.value)}
                      placeholder="POSKART Admin"
                    />
                  </label>
                  <div className="flex gap-2 self-end">
                    <Button
                      className="rounded-xl"
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
                            showErrorToast(
                              "Organization name could not be updated",
                              err,
                              "Failed to update organization.",
                            ),
                        });
                      }}
                    >
                      {updateName.isPending ? "Saving..." : "Save name"}
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-zinc-950">
                        Feature access
                      </div>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        Aktifkan fitur tambahan yang ingin digunakan oleh workspace
                        ini. Perubahan berlaku untuk semua anggota organisasi.
                      </p>
                    </div>
                    {updateFeatures.isPending ? (
                      <span className="shrink-0 text-xs text-zinc-400">Saving...</span>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {[
                      {
                        key: "posKasir" as const,
                        label: "POS Cashier",
                        description: "Input penjualan manual dan pencatatan kasir.",
                        icon: Calculator,
                      },
                      {
                        key: "showcase" as const,
                        label: "Showcase",
                        description: "Halaman publik untuk menampilkan frame dan theme.",
                        icon: PanelsTopLeft,
                      },
                    ].map((feature) => {
                      const Icon = feature.icon;
                      const enabled = tenant?.features?.[feature.key] ?? false;
                      return (
                        <div
                          key={feature.key}
                          className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3"
                        >
                          <div className="flex min-w-0 items-start gap-2.5">
                            <Icon className="mt-0.5 size-4 shrink-0 text-zinc-500" />
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-zinc-950">
                                {feature.label}
                              </div>
                              <div className="mt-0.5 text-xs leading-5 text-zinc-500">
                                {feature.description}
                              </div>
                            </div>
                          </div>
                          <Switch
                            checked={enabled}
                            disabled={updateFeatures.isPending}
                            onCheckedChange={(checked) => {
                              updateFeatures.mutate(
                                {
                                  posKasir: tenant?.features?.posKasir ?? false,
                                  showcase: tenant?.features?.showcase ?? false,
                                  [feature.key]: checked,
                                },
                                {
                                  onSuccess: () =>
                                    toast.success(`${feature.label} updated`),
                                  onError: (err) =>
                                    showErrorToast(
                                      `${feature.label} could not be updated`,
                                      err,
                                      "Feature setting could not be saved.",
                                    ),
                                },
                              );
                            }}
                            aria-label={`Toggle ${feature.label}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {canManageTeam && (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                  <KeyRound className="size-3.5" />
                  Organization join code
                </div>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex w-fit rounded-xl border border-zinc-200 bg-white px-4 py-2 font-mono text-sm font-semibold tracking-[0.24em] text-zinc-950">
                      {joinCode}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 rounded-xl"
                      onClick={() => {
                        void navigator.clipboard.writeText(joinCode);
                        toast.success("Join code disalin");
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      title="Salin join code"
                    >
                      {copied ? (
                        <Check className="size-4 text-emerald-500" />
                      ) : (
                        <Copy className="size-4 text-zinc-500" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs leading-5 text-zinc-500">
                    Bagikan code ini ke staff agar mereka bisa join workspace saat
                    onboarding.
                  </p>
                </div>
              </div>
            )}
          </div>
        </SettingsCard>
      ) : null}

      {!isEditing ? (
        <SettingsCard
          icon={<CreditCard className="size-4" />}
          title="Subscription"
          description={t("settings.subscriptionDesc")}
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
            {canViewSubscription && (
              <Button
                type="button"
                className="rounded-xl"
                onClick={() => setSubscriptionDialogOpen(true)}
              >
                {isFreeAccount ? "View subscription plans" : "Manage billing"}
              </Button>
            )}
          </div>
        </SettingsCard>
      ) : null}

      {canViewPayout && showPayout ? (
        <SettingsCard
          icon={<Landmark className="size-4" />}
          title="Payout account"
          description={t("settings.payoutAccountDesc")}
        >
          <PayoutAccountForm
            account={payoutAccount}
            compact
            onSaved={loadPayoutAccount}
            isEditing={isEditing}
          />
        </SettingsCard>
      ) : null}

      {showTeam ? (
        <SettingsCard
          icon={<UserRound className="size-4" />}
          title="Team"
          description={t("settings.membersDesc")}
          className="border-b-0 pb-0 lg:grid-cols-[180px_minmax(0,1fr)]"
        >
          <div className="space-y-5">
          {canManageTeam && isEditing && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setInviteDialogOpen(true)}
              >
                <MailPlus className="size-4" />
                Invite member
              </Button>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div
              className={cn(
                "hidden border-b border-zinc-100 bg-zinc-50/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400",
                isEditing && canManageTeam
                  ? "sm:grid sm:grid-cols-[minmax(0,1fr)_112px_100px_92px] sm:gap-3"
                  : "sm:grid sm:grid-cols-[minmax(0,1fr)_112px_100px] sm:gap-3",
              )}
            >
              <span>User</span>
              <span>Role</span>
              <span>Joined</span>
              {isEditing && canManageTeam ? <span className="text-right">Actions</span> : null}
            </div>
            {memberRows.map((member) => {
              const canRemove =
                isOwner ||
                (isAdmin && member.role !== "owner" && member.role !== "admin");
              return (
                <div
                  key={member.id}
                  className={cn(
                    "grid gap-3 border-b border-zinc-100 px-4 py-4 last:border-b-0 sm:items-center",
                    isEditing && canManageTeam
                      ? "sm:grid-cols-[minmax(0,1fr)_112px_100px_92px]"
                      : "sm:grid-cols-[minmax(0,1fr)_112px_100px]",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="min-w-0 truncate text-sm font-semibold text-zinc-900"
                        title={member.email}
                      >
                        {member.email}
                      </span>
                      {member.email === myEmail ? (
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          You
                        </Badge>
                      ) : null}
                    </div>
                    <span className="mt-1 block text-[11px] text-zinc-400 sm:hidden">
                      Joined {formatDate(member.created_at)}
                    </span>
                  </div>
                  <div>
                    {isEditing && isOwner && member.email !== myEmail ? (
                      <Select
                        className="h-8 w-full rounded-xl py-0 text-xs"
                        value={member.role}
                        disabled={updateMemberRole.isPending}
                        onChange={(e) => {
                          const newRole = e.target.value;
                          updateMemberRole.mutate(
                            { memberId: member.id, role: newRole },
                            {
                              onSuccess: () =>
                                toast.success(
                                  `Role ${member.email} berhasil diubah menjadi ${newRole}`,
                                ),
                              onError: (err) =>
                                showErrorToast(
                                  "Member role could not be changed",
                                  err,
                                  t("settings.changeRoleFailed"),
                                ),
                            },
                          );
                        }}
                      >
                        <option value="admin">admin</option>
                        <option value="designer">designer</option>
                        <option value="akuntan">akuntan</option>
                        <option value="partner">partner</option>
                      </Select>
                    ) : (
                      <Badge
                        variant={member.role === "admin" ? "warning" : "secondary"}
                      >
                        {member.role}
                      </Badge>
                    )}
                  </div>
                  <span className="hidden text-xs text-zinc-500 sm:block">
                    {formatDate(member.created_at)}
                  </span>
                  {isEditing && canManageTeam ? (
                    <div className="flex items-center gap-1 sm:justify-end">
                      {member.email !== myEmail && isOwner && member.profile_id ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-zinc-500 hover:bg-amber-50 hover:text-amber-700"
                          title="Make owner"
                          aria-label={`Make ${member.email} owner`}
                          onClick={() => {
                            confirmTransfer.confirm({
                              title: "Transfer Kepemilikan?",
                              description: `Pindahkan kepemilikan workspace ke ${member.email}? Peran Anda akan diturunkan menjadi Admin.`,
                              confirmLabel: "Transfer",
                              onConfirm: () => {
                                transferOwnership.mutate(member.profile_id!, {
                                  onSuccess: () =>
                                    toast.success(t("settings.transferOwnershipSuccess")),
                                  onError: (err) =>
                                    showErrorToast(
                                      "Workspace ownership could not be transferred",
                                      err,
                                      t("settings.transferOwnershipFailed"),
                                    ),
                                });
                              },
                            });
                          }}
                        >
                          <KeyRound className="size-4 text-amber-500" />
                        </Button>
                      ) : null}
                      {member.email !== myEmail && canRemove ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-zinc-500 hover:bg-red-50 hover:text-red-600"
                          title="Remove member"
                          aria-label={`Remove ${member.email}`}
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
                                    showErrorToast(
                                      "Member could not be removed",
                                      err,
                                      "Failed to remove member.",
                                    ),
                                });
                              },
                            });
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {!memberRows.length ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">
                No members found.
              </div>
            ) : null}
          </div>

          {canManageTeam && invitationRows.length > 0 && (
            <div className="max-w-full overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-950">
                Pending invitations
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Invited At</TableHead>
                    {isEditing && <TableHead className="text-right">Action</TableHead>}
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
                      {isEditing && (
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
                                  showErrorToast(
                                    "Failed to cancel invitation",
                                    err,
                                    "Undangan tidak dapat dibatalkan. Coba lagi.",
                                  ),
                              });
                            }}
                          >
                            Cancel
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {canManageTeam && requestRows.length > 0 && (
            <div className="max-w-full overflow-x-auto rounded-2xl border border-amber-200 bg-white">
              <div className="border-b border-amber-100 bg-amber-50/50 px-4 py-3 text-sm font-semibold text-amber-900 flex items-center justify-between">
                <span>Pending Join Requests</span>
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">{requestRows.length} requests</Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Email</TableHead>
                    <TableHead>Requested At</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestRows.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.profile?.email ?? "Unknown User"}
                      </TableCell>
                      <TableCell className="text-zinc-500">
                        {formatDate(request.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-xl text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                            disabled={acceptJoinRequest.isPending || rejectJoinRequest.isPending}
                            onClick={() => {
                              acceptJoinRequest.mutate(request.id, {
                              onSuccess: () => toast.success("Permintaan bergabung diterima!"),
                              onError: (err) =>
                                  showErrorToast(
                                    "Join request could not be accepted",
                                    err,
                                    t("settings.acceptRequestFailed"),
                                  ),
                              });
                            }}
                          >
                            <Check className="size-3.5 mr-1" />
                            Accept
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="rounded-xl text-zinc-500 hover:bg-red-50 hover:text-red-600"
                            disabled={acceptJoinRequest.isPending || rejectJoinRequest.isPending}
                            onClick={() => {
                              rejectJoinRequest.mutate(request.id, {
                                onSuccess: () => toast.success("Permintaan bergabung ditolak"),
                                onError: (err) =>
                                  showErrorToast(
                                    "Join request could not be rejected",
                                    err,
                                    t("settings.rejectRequestFailed"),
                                  ),
                              });
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          </div>
        </SettingsCard>
      ) : null}

      {!isEditing && !isOwner ? (
        <SettingsCard
          icon={<LogOut className="size-4" />}
          title="Leave Workspace"
          description={t("settings.leaveOrgDesc")}
        >
          <div className="space-y-4">
            <p className="text-sm text-zinc-500 leading-6">
              Setelah keluar, Anda tidak akan lagi memiliki akses ke workspace ini. Anda akan dialihkan ke halaman onboarding untuk bergabung dengan workspace baru atau membuat workspace sendiri.
            </p>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              disabled={leaveOrg.isPending}
              onClick={() => {
                confirmLeave.confirm({
                  title: "Keluar dari Workspace?",
                  description: "Apakah Anda yakin ingin keluar dari organisasi/workspace ini? Aksi ini tidak dapat dibatalkan.",
                  confirmLabel: leaveOrg.isPending ? "Keluar..." : "Keluar",
                  destructive: true,
                  onConfirm: () => {
                    leaveOrg.mutate(undefined, {
                      onError: (err) =>
                        showErrorToast(
                          "Tidak dapat keluar dari organisasi",
                          err,
                          "Gagal keluar dari organisasi.",
                        ),
                    });
                  },
                });
              }}
            >
              <LogOut className="size-4 mr-2" />
              {leaveOrg.isPending ? "Keluar..." : "Keluar dari Organisasi"}
            </Button>
          </div>
        </SettingsCard>
      ) : null}

      {!isEditing && isOwner && tenant ? (
        <SettingsCard
          icon={<AlertTriangle className="size-4" />}
          title="Danger Zone"
          description="Tindakan permanen untuk workspace ini."
          className="border-red-200"
        >
          <div className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold text-red-950">Delete this workspace</div>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-red-800">
                Hapus seluruh data workspace {tenant.name} secara permanen.
                Aksi ini tidak dapat dibatalkan.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="size-4" />
              Delete workspace
            </Button>
          </div>
        </SettingsCard>
      ) : null}

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
              showErrorToast(
                "Invitation could not be sent",
                err,
                "Failed to invite user.",
              ),
          });
        }}
      />
      {tenant ? (
        <OrganizationDeleteDialog
          open={deleteDialogOpen}
          organizationName={tenant.name}
          isDeleting={deleteMyOrganization.isPending}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={(confirmation) => {
            deleteMyOrganization.mutate(confirmation, {
              onError: (error) => {
                showErrorToast(
                  "Workspace deletion failed",
                  error,
                  "Workspace tidak dapat dihapus. Hapus data terkait terlebih dahulu, lalu coba lagi.",
                );
              },
            });
          }}
        />
      ) : null}
    </div>
  );
}
