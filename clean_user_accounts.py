import re

with open('components/data-table/operations-pages.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove TableHead headers for Active Plan, Expiration Date, Status
content = re.sub(r'<TableHead>Active Plan</TableHead>\s*<TableHead>Expiration Date</TableHead>\s*<TableHead>Status</TableHead>\s*', '', content)

# 2. In TenantManagement (Registered User Accounts), remove the table cells
cell_pattern = r'<TableCell className="text-xs font-mono uppercase font-semibold">.*?</TableCell>\s*<TableCell className="text-sm">.*?</TableCell>\s*<TableCell>\s*<span.*?</TableCell>'
content = re.sub(cell_pattern, '', content, flags=re.DOTALL)

# 3. In UserEditDialog, remove state variables for plan
content = re.sub(r'const tenantSub = profile\.organizations;\s*', '', content)
content = re.sub(r'const \[planId, setPlanId\] = useState\(tenantSub\?\.plan_id \|\| "free"\);\s*', '', content)
content = re.sub(r'const \[deviceLimit, setDeviceLimit\] = useState\(tenantSub\?\.device_limit \?\? 1\);\s*', '', content)
content = re.sub(r'const \[expiry, setExpiry\] = useState\(\(\) => \{[\s\S]*?\}\);\s*', '', content)

# 4. In UserEditDialog, remove the form fields for Plan, Device Limit, Expiry
dialog_fields_pattern = r'<div className="space-y-4 pt-4 border-t border-zinc-100">.*?</div>\s*</div>'
content = re.sub(dialog_fields_pattern, '</div>', content, flags=re.DOTALL)

# 5. In UserEditDialog onSubmit, remove the tenantPatch logic
content = re.sub(r'onSubmit\(\{ role \}, \{[\s\S]*?\}\);', 'onSubmit({ role });', content)

with open('components/data-table/operations-pages.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Cleaned up user accounts table and dialog")
