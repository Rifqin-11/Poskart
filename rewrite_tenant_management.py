import re

with open('components/data-table/operations-pages.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract the existing TenantManagement function body
start_idx = content.find('export function TenantManagement() {')
end_idx = content.find('function TenantFormDialog', start_idx)

# Find the existing <Card> that renders the organization table
card_start = content.find('<Card>', start_idx)
card_end = content.find('</Card>', card_start) + len('</Card>')
existing_card = content[card_start:card_end]

# Find the existing dialogs
dialog_start = content.find('{creating ? (', start_idx)
dialog_end = content.find('    </div>', dialog_start)
existing_dialogs = content[dialog_start:dialog_end]

new_tenant_management = """export function TenantManagement() {
  const { data = [] } = useTenants();
  const { data: profiles = [], isLoading: isLoadingProfiles } = useProfiles();
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();
  const updateProfile = useUpdateProfile();
  
  const [editing, setEditing] = useState<Organization | null>(null);
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  const handleDelete = (organization: Organization) => {
    if (!confirm(`Delete organization "${organization.name}"?`)) return;
    deleteTenant.mutate(organization.id, {
      onSuccess: () => toast.success("Organization deleted"),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Delete failed"),
    });
  };

  return (
    <div>
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
        <TabsList className="mb-4">
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="users">Registered Users</TabsTrigger>
        </TabsList>
        <TabsContent value="organizations">
""" + "          " + existing_card.replace('\n', '\n          ') + """
        </TabsContent>
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Accounts</CardTitle>
              <CardDescription>All user accounts across the system.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>System Role</TableHead>
                    <TableHead>Organization ID</TableHead>
                    <TableHead>Joined At</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile: any) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">{profile.email}</TableCell>
                      <TableCell>
                        <Badge variant={profile.role === "admin" ? "warning" : "secondary"}>
                          {profile.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-zinc-500">
                        {profile.tenant_id || "None"}
                      </TableCell>
                      <TableCell>{new Date(profile.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEditingProfile(profile)}>
                          Edit Role
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {profiles.length === 0 && !isLoadingProfiles && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-zinc-500 py-8">No users found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
""" + existing_dialogs + """
      {editingProfile ? (
        <Dialog open onOpenChange={(o) => !o && setEditingProfile(null)} title={`Edit ${editingProfile.email}`}>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-zinc-700">System Role</label>
            <Select 
              value={editingProfile.role} 
              onChange={(e) => setEditingProfile({ ...editingProfile, role: e.target.value })}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </Select>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingProfile(null)}>Cancel</Button>
              <Button 
                onClick={() => {
                  updateProfile.mutate({ id: editingProfile.id, patch: { role: editingProfile.role } }, {
                    onSuccess: () => {
                      toast.success("User role updated");
                      setEditingProfile(null);
                    },
                    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update role")
                  });
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
"""

new_content = content[:start_idx] + new_tenant_management + content[dialog_end:]

with open('components/data-table/operations-pages.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("TenantManagement updated with Tabs for Users and Organizations")
