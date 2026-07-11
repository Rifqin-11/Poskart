"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { PageHeader } from "@/features/admin/_components/page-header";
import {
  useCreateTenant,
  useDeleteTenant,
  useProfiles,
  useTenants,
  useUpdateProfile,
  useUpdateTenant,
} from "@/features/admin/superadmin/use-superadmin";
import {
  useSubscriptionPlans,
  useUpdateSubscriptionPlan,
} from "@/features/admin/pricing/use-pricing";
import type { Organization } from "@/types/organization";
import type { TenantInput } from "@/features/admin/superadmin/api";
import type { SubscriptionPlan } from "@/types/pricing";

import { TenantFormDialog } from "./_components/tenant-form-dialog";
import { SubscriptionPlanDialog } from "./_components/subscription-plan-dialog";
import { PaymentGatewayManagement } from "./_components/payment-gateway-management";
import { SaasPricingManagement } from "./_components/saas-pricing-management";
import { PayoutInvoiceManagement } from "./_components/payout-invoice-management";
import { TransactionActionRequestManagement } from "./_components/transaction-action-request-management";
import { GalleryStorageManagement } from "./_components/gallery-storage-management";
import { DEFAULT_ORGANIZATION_FEATURES } from "@/lib/organization-features";

type AdminUserProfile = {
  id: string;
  email: string;
  role: string;
  created_at: string;
  organizationId: string | null;
  organizationName: string | null;
  memberRole: string | null;
};

type SuperAdminSection = "overview" | "organizations" | "finance" | "requests";

const EMPTY_TENANT: TenantInput = {
  name: "",
  plan: "Free",
  status: "active",
  devices: 0,
  users: 1,
  renewalDate: new Date().toISOString().slice(0, 10),
  planId: "free",
  subscriptionStatus: "free",
  subscriptionExpiresAt: null,
  deviceLimit: 1,
  paymentCollectionMode: "platform",
  features: DEFAULT_ORGANIZATION_FEATURES,
};

export function TenantManagement() {
  const { data = [] } = useTenants();
  const tenantsList = data as Organization[];
  const { data: rawProfiles = [], isLoading: isLoadingProfiles } = useProfiles();
  const profiles = rawProfiles as AdminUserProfile[];
  const { data: rawSubscriptionPlans = [] } = useSubscriptionPlans();
  const subscriptionPlans = rawSubscriptionPlans as SubscriptionPlan[];
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();
  const updateProfile = useUpdateProfile();
  const updatePlan = useUpdateSubscriptionPlan();

  const [editing, setEditing] = useState<Organization | null>(null);
  const [editingProfile, setEditingProfile] = useState<AdminUserProfile | null>(
    null,
  );
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [creating, setCreating] = useState(false);
  const [activeSection, setActiveSection] =
    useState<SuperAdminSection>("overview");
  const [organizationPage, setOrganizationPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const pageSize = 10;
  const confirmDelete = useConfirmDialog();

  const paginatedOrganizations = tenantsList.slice(
    (organizationPage - 1) * pageSize,
    organizationPage * pageSize,
  );
  const paginatedProfiles = profiles.slice(
    (userPage - 1) * pageSize,
    userPage * pageSize,
  );
  const activeOrganizations = tenantsList.filter(
    (organization) => organization.status === "active",
  ).length;
  const activeSubscriptions = tenantsList.filter(
    (organization) =>
      organization.subscriptionStatus === "active" ||
      organization.subscriptionStatus === "trialing" ||
      organization.subscriptionStatus === "trial",
  ).length;
  const customPaymentOrganizations = tenantsList.filter(
    (organization) => organization.paymentCollectionMode === "custom",
  ).length;
  const totalDevices = tenantsList.reduce(
    (sum, organization) => sum + organization.devices,
    0,
  );

  const handleDelete = (organization: Organization) => {
    confirmDelete.confirm({
      title: "Delete organization?",
      description: `Delete organization "${organization.name}"?`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => {
        deleteTenant.mutate(organization.id, {
          onSuccess: () => toast.success("Organization deleted"),
          onError: (err) =>
            toast.error(err instanceof Error ? err.message : "Delete failed"),
        });
      },
    });
  };

  return (
    <div>
      {confirmDelete.dialog}
      <PageHeader
        title="Super Admin Dashboard"
        description="Multi-organization SaaS controls and registered user accounts."
        action={
          <Button className="w-full sm:w-auto" onClick={() => setCreating(true)}>
            <Users className="size-4" /> Create organization
          </Button>
        }
      />
      {activeSection === "overview" ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SuperAdminMetricCard
              icon={Building2}
              label="Organizations"
              value={tenantsList.length.toLocaleString()}
              description={`${activeOrganizations} active workspaces`}
            />
            <SuperAdminMetricCard
              icon={Users}
              label="Registered users"
              value={profiles.length.toLocaleString()}
              description="Across all organizations"
            />
            <SuperAdminMetricCard
              icon={ShieldCheck}
              label="Active subscriptions"
              value={activeSubscriptions.toLocaleString()}
              description="Active or trialing plans"
            />
            <SuperAdminMetricCard
              icon={WalletCards}
              label="Payment setup"
              value={`${customPaymentOrganizations} custom`}
              description={`${tenantsList.length - customPaymentOrganizations} using POSKART PG`}
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <SuperAdminSectionButton
              icon={Building2}
              title="Organizations"
              description="Manage workspaces, users, subscriptions, device limits, and enabled features."
              onClick={() => setActiveSection("organizations")}
            />
            <SuperAdminSectionButton
              icon={WalletCards}
              title="Finance"
              description="Configure pricing, payment gateway, and payout or withdrawal operations."
              onClick={() => setActiveSection("finance")}
            />
            <SuperAdminSectionButton
              icon={ShieldCheck}
              title="Requests"
              description="Review transaction verification, refund, and archive requests from organizations."
              onClick={() => setActiveSection("requests")}
            />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>Recent organizations</CardTitle>
                <CardDescription>
                  Latest workspaces that need operational attention.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-zinc-100">
                  {tenantsList.slice(0, 5).map((organization) => (
                    <div
                      key={organization.id}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-zinc-950">
                          {organization.name}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">
                          {organization.plan} · {organization.users} users
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                        <SubscriptionStatusBadge organization={organization} />
                        <PaymentCollectionBadge organization={organization} />
                      </div>
                    </div>
                  ))}
                  {tenantsList.length === 0 ? (
                    <div className="py-8 text-center text-sm text-zinc-400">
                      No organizations yet.
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System snapshot</CardTitle>
                <CardDescription>
                  Quick operational signal before opening detailed sections.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <OverviewLine label="Active devices" value={totalDevices} />
                <OverviewLine
                  label="Platform PG organizations"
                  value={tenantsList.length - customPaymentOrganizations}
                />
                <OverviewLine
                  label="Custom PG organizations"
                  value={customPaymentOrganizations}
                />
                <OverviewLine
                  label="Free organizations"
                  value={
                    tenantsList.filter(
                      (organization) =>
                        organization.subscriptionStatus === "free",
                    ).length
                  }
                />
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
      {activeSection === "organizations" ? (
        <div className="space-y-4">
          <SuperAdminBackHeader
            title="Organizations"
            description="Manage organization records and registered user accounts."
            onBack={() => setActiveSection("overview")}
          />
          <Tabs defaultValue="organization-list">
            <div className="mb-4 rounded-[24px] bg-white p-2 shadow-sm">
              <TabsList className="w-full justify-start rounded-[18px]">
                <TabsTrigger value="organization-list">
                  Organizations
                </TabsTrigger>
                <TabsTrigger value="user-accounts">
                  Registered Users
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="organization-list">
              <Card>
                <CardContent className="pt-5">
                  <div className="hidden overflow-x-auto xl:block">
                    <Table className="min-w-[1180px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Organization</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Subscription Status</TableHead>
                          <TableHead>Org Status</TableHead>
                          <TableHead>Devices</TableHead>
                          <TableHead>Users</TableHead>
                          <TableHead>Collection</TableHead>
                          <TableHead>Enabled Features</TableHead>
                          <TableHead>Renewal / Expiration</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedOrganizations.map((organization) => (
                          <TableRow key={organization.id}>
                            <TableCell className="font-medium">
                              {organization.name}
                            </TableCell>
                            <TableCell>{organization.plan}</TableCell>
                            <TableCell>
                              <SubscriptionStatusBadge
                                organization={organization}
                              />
                            </TableCell>
                            <TableCell>
                              <OrganizationStatusBadge
                                organization={organization}
                              />
                            </TableCell>
                            <TableCell>
                              {organization.devices} /{" "}
                              {organization.deviceLimit ?? 1}
                            </TableCell>
                            <TableCell>{organization.users}</TableCell>
                            <TableCell>
                              <PaymentCollectionBadge
                                organization={organization}
                              />
                            </TableCell>
                            <TableCell>
                              <OrganizationFeatureBadges
                                organization={organization}
                              />
                            </TableCell>
                            <TableCell>
                              <OrganizationExpiry organization={organization} />
                            </TableCell>
                            <TableCell>
                              <OrganizationActions
                                organization={organization}
                                onEdit={setEditing}
                                onDelete={handleDelete}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                        {tenantsList.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={10}
                              className="py-8 text-center text-sm text-zinc-400"
                            >
                              No organizations yet. Click{" "}
                              <strong>Create organization</strong>.
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="grid gap-3 xl:hidden">
                    {paginatedOrganizations.map((organization) => (
                      <div
                        key={organization.id}
                        className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-zinc-950">
                              {organization.name}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">
                              {organization.plan} · {organization.users} users
                            </div>
                          </div>
                          <OrganizationActions
                            organization={organization}
                            onEdit={setEditing}
                            onDelete={handleDelete}
                          />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          <SubscriptionStatusBadge
                            organization={organization}
                          />
                          <OrganizationStatusBadge
                            organization={organization}
                          />
                          <PaymentCollectionBadge
                            organization={organization}
                          />
                        </div>
                        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                          <CompactInfo label="Devices">
                            {organization.devices} /{" "}
                            {organization.deviceLimit ?? 1}
                          </CompactInfo>
                          <CompactInfo label="Renewal / expiration">
                            <OrganizationExpiry organization={organization} />
                          </CompactInfo>
                        </div>
                        <div className="mt-4 border-t border-zinc-100 pt-3">
                          <div className="mb-2 text-xs font-medium text-zinc-500">
                            Enabled features
                          </div>
                          <OrganizationFeatureBadges
                            organization={organization}
                          />
                        </div>
                      </div>
                    ))}
                    {tenantsList.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-400">
                        No organizations yet. Click{" "}
                        <strong>Create organization</strong>.
                      </div>
                    ) : null}
                  </div>
                  <TablePagination
                    page={organizationPage}
                    pageSize={pageSize}
                    totalItems={tenantsList.length}
                    onPageChange={setOrganizationPage}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="user-accounts">
              <Card>
                <CardHeader>
                  <CardTitle>User Accounts</CardTitle>
                  <CardDescription>
                    All user accounts across the system.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="hidden overflow-x-auto lg:block">
                    <Table className="min-w-[760px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>System Role</TableHead>
                          <TableHead>Organization</TableHead>
                          <TableHead>Joined At</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedProfiles.map((profile) => (
                          <TableRow key={profile.id}>
                            <TableCell className="font-medium">
                              {profile.email}
                            </TableCell>
                            <TableCell>
                              <UserRoleBadge role={profile.role} />
                            </TableCell>
                            <TableCell className="text-zinc-600">
                              {profile.organizationName || "None"}
                            </TableCell>
                            <TableCell>
                              {new Date(profile.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingProfile(profile)}
                              >
                                Edit User
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {profiles.length === 0 && !isLoadingProfiles && (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="py-8 text-center text-zinc-500"
                            >
                              No users found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="grid gap-3 lg:hidden">
                    {paginatedProfiles.map((profile) => (
                      <div
                        key={profile.id}
                        className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-zinc-950">
                              {profile.email}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">
                              Joined{" "}
                              {new Date(
                                profile.created_at,
                              ).toLocaleDateString()}
                            </div>
                          </div>
                          <UserRoleBadge role={profile.role} />
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3">
                          <CompactInfo label="Organization">
                            {profile.organizationName || "None"}
                          </CompactInfo>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingProfile(profile)}
                          >
                            Edit User
                          </Button>
                        </div>
                      </div>
                    ))}
                    {profiles.length === 0 && !isLoadingProfiles ? (
                      <div className="rounded-3xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">
                        No users found.
                      </div>
                    ) : null}
                  </div>
                  <TablePagination
                    page={userPage}
                    pageSize={pageSize}
                    totalItems={profiles.length}
                    onPageChange={setUserPage}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
      {activeSection === "finance" ? (
        <div className="space-y-4">
          <SuperAdminBackHeader
            title="Finance"
            description="Manage SaaS pricing, subscription payment gateway, and payout operations."
            onBack={() => setActiveSection("overview")}
          />
          <Tabs defaultValue="saas-pricing">
            <div className="mb-4 rounded-[24px] bg-white p-2 shadow-sm">
              <TabsList className="w-full justify-start rounded-[18px]">
                <TabsTrigger value="saas-pricing">Pricing</TabsTrigger>
                <TabsTrigger value="payment-gateway">Payment Gateway</TabsTrigger>
                <TabsTrigger value="gallery-storage">
                  Gallery Storage
                </TabsTrigger>
                <TabsTrigger value="payout-invoices">
                  Payout / Withdraw
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="saas-pricing">
              <SaasPricingManagement
                subscriptionPlans={subscriptionPlans}
                onEditPlan={setEditingPlan}
              />
            </TabsContent>
            <TabsContent value="payment-gateway">
              <PaymentGatewayManagement />
            </TabsContent>
            <TabsContent value="gallery-storage">
              <GalleryStorageManagement />
            </TabsContent>
            <TabsContent value="payout-invoices">
              <PayoutInvoiceManagement organizations={tenantsList} />
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
      {activeSection === "requests" ? (
        <div className="space-y-4">
          <SuperAdminBackHeader
            title="Requests"
            description="Review operational requests that need super admin approval."
            onBack={() => setActiveSection("overview")}
          />
          <TransactionActionRequestManagement />
        </div>
      ) : null}

      {creating ? (
        <TenantFormDialog
          title="Create organization"
          initial={EMPTY_TENANT}
          subscriptionPlans={subscriptionPlans}
          submitting={createTenant.isPending}
          onClose={() => setCreating(false)}
          onSubmit={(values) => {
            createTenant.mutate(values, {
              onSuccess: () => {
                toast.success("Organization created");
                setCreating(false);
              },
              onError: (err) =>
                toast.error(
                  err instanceof Error ? err.message : "Create failed",
                ),
            });
          }}
        />
      ) : null}
      {editing ? (
        <TenantFormDialog
          title={`Edit ${editing.name}`}
          initial={editing}
          subscriptionPlans={subscriptionPlans}
          submitting={updateTenant.isPending}
          onClose={() => setEditing(null)}
          onSubmit={(values) => {
            updateTenant.mutate(
              { id: editing.id, patch: values },
              {
                onSuccess: () => {
                  toast.success("Organization updated");
                  setEditing(null);
                },
                onError: (err) =>
                  toast.error(
                    err instanceof Error ? err.message : "Update failed",
                  ),
              },
            );
          }}
        />
      ) : null}

      {editingProfile ? (
        <Dialog
          open
          onOpenChange={(o) => !o && setEditingProfile(null)}
          title={`Edit ${editingProfile.email}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                System Role
              </label>
              <Select
                className="mt-1"
                value={editingProfile.role}
                onChange={(e) =>
                  setEditingProfile({ ...editingProfile, role: e.target.value })
                }
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Organization
              </label>
              <Select
                className="mt-1"
                value={editingProfile.organizationId || ""}
                onChange={(e) =>
                  setEditingProfile({
                    ...editingProfile,
                    organizationId: e.target.value || null,
                  })
                }
              >
                <option value="">No Organization</option>
                {tenantsList.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100">
              <Button variant="outline" onClick={() => setEditingProfile(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  updateProfile.mutate(
                    {
                      id: editingProfile.id,
                      patch: { role: editingProfile.role },
                      organizationId: editingProfile.organizationId,
                    },
                    {
                      onSuccess: () => {
                        toast.success("User updated successfully");
                        setEditingProfile(null);
                      },
                      onError: (err) =>
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : "Failed to update user",
                        ),
                    },
                  );
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}

      {editingPlan ? (
        <SubscriptionPlanDialog
          plan={editingPlan}
          submitting={updatePlan.isPending}
          onClose={() => setEditingPlan(null)}
          onSubmit={(values) => {
            updatePlan.mutate(
              { id: editingPlan.id, values },
              {
                onSuccess: () => {
                  toast.success("SaaS pricing updated");
                  setEditingPlan(null);
                },
                onError: (err) =>
                  toast.error(
                    err instanceof Error ? err.message : "Update failed",
                  ),
              },
            );
          }}
        />
      ) : null}
    </div>
  );
}

function SubscriptionStatusBadge({
  organization,
}: {
  organization: Organization;
}) {
  return (
    <Badge
      variant={
        organization.subscriptionStatus === "active"
          ? "success"
          : organization.subscriptionStatus === "trialing" ||
              organization.subscriptionStatus === "trial"
            ? "warning"
            : "secondary"
      }
    >
      {organization.subscriptionStatus || "free"}
    </Badge>
  );
}

function SuperAdminMetricCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-5">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-zinc-100 text-zinc-700">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm text-zinc-500">{label}</div>
          <div className="mt-1 truncate text-2xl font-semibold text-zinc-950">
            {value}
          </div>
          <div className="mt-1 text-xs text-zinc-500">{description}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function SuperAdminSectionButton({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[138px] w-full items-start justify-between gap-4 rounded-[28px] border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
    >
      <div className="min-w-0">
        <div className="grid size-11 place-items-center rounded-2xl bg-zinc-100 text-zinc-700 transition group-hover:bg-zinc-950 group-hover:text-white">
          <Icon className="size-5" />
        </div>
        <div className="mt-4 text-base font-semibold text-zinc-950">
          {title}
        </div>
        <div className="mt-1 max-w-sm text-sm leading-5 text-zinc-500">
          {description}
        </div>
      </div>
      <ArrowRight className="mt-1 size-5 shrink-0 text-zinc-400 transition group-hover:translate-x-1 group-hover:text-zinc-900" />
    </button>
  );
}

function SuperAdminBackHeader({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[28px] border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 mb-2 text-zinc-500 hover:text-zinc-950"
          onClick={onBack}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div className="text-lg font-semibold text-zinc-950">{title}</div>
        <div className="mt-1 text-sm text-zinc-500">{description}</div>
      </div>
    </div>
  );
}

function OverviewLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-sm font-semibold text-zinc-950">
        {value.toLocaleString()}
      </span>
    </div>
  );
}

function OrganizationStatusBadge({
  organization,
}: {
  organization: Organization;
}) {
  return (
    <Badge variant={organization.status === "active" ? "outline" : "secondary"}>
      {organization.status}
    </Badge>
  );
}

function PaymentCollectionBadge({
  organization,
}: {
  organization: Organization;
}) {
  return (
    <Badge
      variant={
        organization.paymentCollectionMode === "custom" ? "secondary" : "outline"
      }
    >
      {organization.paymentCollectionMode === "custom"
        ? "Custom PG"
        : "POSKART PG"}
    </Badge>
  );
}

function OrganizationFeatureBadges({
  organization,
}: {
  organization: Organization;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {organization.features?.posKasir ? (
        <Badge variant="outline">POS Kasir</Badge>
      ) : null}
      {organization.features?.money ? (
        <Badge variant="outline">Keuangan</Badge>
      ) : null}
      {!organization.features?.posKasir && !organization.features?.money ? (
        <span className="text-xs text-zinc-400">SaaS default</span>
      ) : null}
    </div>
  );
}

function OrganizationExpiry({ organization }: { organization: Organization }) {
  return (
    <>
      {organization.subscriptionExpiresAt
        ? new Date(organization.subscriptionExpiresAt).toLocaleDateString()
        : "Never"}
    </>
  );
}

function OrganizationActions({
  organization,
  onEdit,
  onDelete,
}: {
  organization: Organization;
  onEdit: (organization: Organization) => void;
  onDelete: (organization: Organization) => void;
}) {
  return (
    <DropdownMenu
      items={[
        {
          label: "Edit",
          onClick: () => onEdit(organization),
        },
        {
          label: "Delete",
          destructive: true,
          onClick: () => onDelete(organization),
        },
      ]}
    />
  );
}

function UserRoleBadge({ role }: { role: string }) {
  return (
    <Badge variant={role === "admin" ? "warning" : "secondary"}>{role}</Badge>
  );
}

function CompactInfo({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 truncate text-sm font-medium text-zinc-900">
        {children}
      </div>
    </div>
  );
}
