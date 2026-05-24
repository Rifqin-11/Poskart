with open('components/data-table/operations-pages.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove TableHead headers
content = content.replace('<TableHead>Active Plan</TableHead>\n                      <TableHead>Expiration Date</TableHead>\n                      <TableHead>Status</TableHead>', '')

# 2. Remove the cells from the Registered User Accounts map
# This is tricky without regex. Let's find the TableBody inside TenantManagement.
import re
cell_pattern = r'<TableCell className="text-xs font-mono uppercase font-semibold">.*?</TableCell>\s*<TableCell className="text-sm">.*?</TableCell>\s*<TableCell>\s*<span[^>]*>.*?</span>\s*</TableCell>'
# Only replace the specific occurrence inside profiles.map
content = re.sub(cell_pattern, '', content, flags=re.DOTALL)

# 3. Clean UserEditDialog logic
content = content.replace('const tenantSub = profile.organizations;\n  const [role, setRole] = useState(profile.role);\n  const [planId, setPlanId] = useState(tenantSub?.plan_id || "free");\n  const [deviceLimit, setDeviceLimit] = useState(tenantSub?.device_limit ?? 1);\n  const [expiry, setExpiry] = useState(() => {\n    if (tenantSub?.subscription_expires_at) {\n      return new Date(tenantSub.subscription_expires_at).toISOString().slice(0, 16);\n    }\n    return "";\n  });', 'const [role, setRole] = useState(profile.role);')

# 4. Remove the inputs from UserEditDialog
dialog_fields = re.search(r'(<div className="space-y-4 pt-4 border-t border-zinc-100">.*?</div>\s*</div>)', content, re.DOTALL)
if dialog_fields:
    # Make sure we only remove the inputs in UserEditDialog, not TenantFormDialog
    # UserEditDialog has "Organization Subscription Override"
    if "Organization Subscription Override" in dialog_fields.group(1):
        content = content.replace(dialog_fields.group(1), '</div>')

# 5. Fix onSubmit in UserEditDialog
content = content.replace('onSubmit(patch, tenantPatch) {', 'onSubmit(patch) {')
content = content.replace('onSubmit({ role }, tenantPatch);', 'onSubmit({ role });')

# Also fix the definition
content = content.replace('onSubmit: (patch: any, tenantPatch?: any) => void;', 'onSubmit: (patch: any) => void;')

# Fix the call in UserEditDialog wrapper
content = content.replace('onSubmit={(patch, tenantPatch) => {', 'onSubmit={(patch) => {')
content = content.replace('updateProfile.mutate(\n              { id: editingProfile.id, patch, tenantPatch },', 'updateProfile.mutate(\n              { id: editingProfile.id, patch, tenantPatch: undefined },')

with open('components/data-table/operations-pages.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Safe clean complete")
