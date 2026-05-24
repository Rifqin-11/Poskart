with open('components/data-table/operations-pages.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
hooks_import = """  useUpdateTenant,
  useSubscriptionStatus,
  useSubscriptionOrders,
  useUpdateSubscriptionOrderStatus,
  useProfiles,
  useUpdateProfile,
  useDeleteProfile,
  useTenantDetails,
  useUpdateTenantName,
  useTenantMembers,
  useTenantInvitations,
  useInviteUser,
  useDeleteInvitation,
  useRemoveMember,
} from "@/hooks/use-admin-data";
import { createClient } from "@/lib/supabase/client";"""

content = content.replace('  useUpdateTenant,\n} from "@/hooks/use-admin-data";', hooks_import)

# 2. Add OrganizationPanel and OrganizationSettings at the end of the file
org_panel_code = """
export function OrganizationPanel() {
  const { data: sub } = useSubscriptionStatus();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Management"
        description="Manage your subscription plan, organization details, and team members."
      />
      <OrganizationSettings />
    </div>
  );
}

function OrganizationSettings() {
  const { data: tenant, isLoading: isLoadingTenant } = useTenantDetails();
  const { data: members = [] } = useTenantMembers();
  const { data: invitations = [] } = useTenantInvitations();
  
  const updateName = useUpdateTenantName();
  const inviteUser = useInviteUser();
  const deleteInvitation = useDeleteInvitation();
  const removeMember = useRemoveMember();

  const [newName, setNewName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [myEmail, setMyEmail] = useState("");

  const supabase = createClient();
  useEffect(() => {
    supabase.auth.getUser().then((res: { data: { user: any } }) => {
      if (res.data?.user?.email) setMyEmail(res.data.user.email);
    });
  }, [supabase]);

  useEffect(() => {
    if (tenant?.name) setNewName(tenant.name);
  }, [tenant]);

  if (isLoadingTenant) return <div className="p-8 text-center text-zinc-500">Loading organization details...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>Update your organization's name and view limits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3 max-w-md">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-zinc-500">Organization Name</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="My Organization" />
            </div>
            <Button 
              disabled={!newName.trim() || newName === tenant?.name || updateName.isPending}
              onClick={() => {
                updateName.mutate(newName, {
                  onSuccess: () => toast.success("Organization name updated"),
                  onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update name")
                });
              }}
            >
              {updateName.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100 sm:grid-cols-4">
            <div>
              <div className="text-xs text-zinc-500 font-medium mb-1">Plan</div>
              <Badge variant="outline">{tenant?.plan_id?.toUpperCase() || "FREE"}</Badge>
            </div>
            <div>
              <div className="text-xs text-zinc-500 font-medium mb-1">Status</div>
              <div className="text-sm font-medium capitalize">{tenant?.subscription_status || "Free"}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 font-medium mb-1">Devices Allowed</div>
              <div className="text-sm font-medium">{tenant?.device_limit || 1}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 font-medium mb-1">Expiry Date</div>
              <div className="text-sm font-medium text-zinc-700">
                {tenant?.subscription_expires_at ? new Date(tenant.subscription_expires_at).toLocaleDateString() : "Never"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>People with access to this organization.</CardDescription>
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
              {members.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    {m.email}
                    {m.email === myEmail && <Badge variant="secondary" className="ml-2 text-[10px]">You</Badge>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.role === "admin" ? "warning" : "secondary"}>
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
                        if (confirm(`Remove ${m.email} from organization?`)) {
                          removeMember.mutate(m.id, {
                            onSuccess: () => toast.success("Member removed"),
                            onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to remove member")
                          });
                        }
                      }}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-zinc-500 py-6">No members found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>Invite people to join your organization.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form 
            className="flex items-end gap-3 max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              if (!inviteEmail.trim() || inviteEmail === myEmail) return;
              inviteUser.mutate(inviteEmail, {
                onSuccess: () => {
                  toast.success(`Invitation sent to ${inviteEmail}`);
                  setInviteEmail("");
                },
                onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to invite user")
              });
            }}
          >
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-zinc-500">Email Address</label>
              <Input 
                type="email" 
                value={inviteEmail} 
                onChange={(e) => setInviteEmail(e.target.value)} 
                placeholder="colleague@example.com" 
              />
            </div>
            <Button disabled={!inviteEmail.trim() || inviteEmail === myEmail || inviteUser.isPending}>
              {inviteUser.isPending ? "Sending..." : "Invite"}
            </Button>
          </form>

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
                  {invitations.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium text-zinc-600">{inv.email}</TableCell>
                      <TableCell className="text-zinc-500">{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            deleteInvitation.mutate(inv.id, {
                              onSuccess: () => toast.success("Invitation cancelled"),
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
    </div>
  );
}
"""

content = content + "\n" + org_panel_code

with open('components/data-table/operations-pages.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Panel fixed")
