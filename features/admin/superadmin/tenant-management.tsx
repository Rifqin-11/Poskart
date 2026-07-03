"use client";

import { useState } from "react";
import { Users } from "lucide-react";
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
          <Button onClick={() => setCreating(true)}>
            <Users className="size-4" /> Create organization
          </Button>
        }
      />
      <Tabs defaultValue="organizations">
        <div className="mb-4 w-full bg-white p-2 rounded-full">
          <TabsList>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="users">Registered Users</TabsTrigger>
            <TabsTrigger value="saas-pricing">SaaS Pricing</TabsTrigger>
            <TabsTrigger value="payment-gateway">Payment Gateway</TabsTrigger>
            <TabsTrigger value="payout-invoices">Payout Invoices</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="organizations">
          <Card>
            <CardContent className="pt-5">
              <Table>
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
                        <Badge
                          variant={
                            organization.subscriptionStatus === "active"
                              ? "success"
                              : organization.subscriptionStatus ===
                                    "trialing" ||
                                  organization.subscriptionStatus === "trial"
                                ? "warning"
                                : "secondary"
                          }
                        >
                          {organization.subscriptionStatus || "free"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            organization.status === "active"
                              ? "outline"
                              : "secondary"
                          }
                        >
                          {organization.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {organization.devices} / {organization.deviceLimit ?? 1}
                      </TableCell>
                      <TableCell>{organization.users}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            organization.paymentCollectionMode === "custom"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {organization.paymentCollectionMode === "custom"
                            ? "Custom PG"
                            : "POSKART PG"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {organization.features?.posKasir ? (
                            <Badge variant="outline">POS Kasir</Badge>
                          ) : null}
                          {organization.features?.money ? (
                            <Badge variant="outline">Keuangan</Badge>
                          ) : null}
                          {!organization.features?.posKasir &&
                          !organization.features?.money ? (
                            <span className="text-xs text-zinc-400">
                              SaaS default
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {organization.subscriptionExpiresAt
                          ? new Date(
                              organization.subscriptionExpiresAt,
                            ).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu
                          items={[
                            {
                              label: "Edit",
                              onClick: () => setEditing(organization),
                            },
                            {
                              label: "Delete",
                              destructive: true,
                              onClick: () => handleDelete(organization),
                            },
                          ]}
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
              <TablePagination
                page={organizationPage}
                pageSize={pageSize}
                totalItems={tenantsList.length}
                onPageChange={setOrganizationPage}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Accounts</CardTitle>
              <CardDescription>
                All user accounts across the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
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
                        <Badge
                          variant={
                            profile.role === "admin" ? "warning" : "secondary"
                          }
                        >
                          {profile.role}
                        </Badge>
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
                        className="text-center text-zinc-500 py-8"
                      >
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <TablePagination
                page={userPage}
                pageSize={pageSize}
                totalItems={profiles.length}
                onPageChange={setUserPage}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="saas-pricing">
          <SaasPricingManagement
            subscriptionPlans={subscriptionPlans}
            onEditPlan={setEditingPlan}
          />
        </TabsContent>
        <TabsContent value="payment-gateway">
          <PaymentGatewayManagement />
        </TabsContent>
        <TabsContent value="payout-invoices">
          <PayoutInvoiceManagement organizations={tenantsList} />
        </TabsContent>
      </Tabs>

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
