import re

with open('components/data-table/operations-pages.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove onSubmit object keys that are undefined
content = re.sub(r'plan_id:\s*planId,', '', content)
content = re.sub(r'plan:\s*planId\s*===.*?,', '', content)
content = re.sub(r'subscription_status:\s*planId\s*===.*?,', '', content)
content = re.sub(r'subscription_expires_at:\s*planId\s*===.*?,', '', content)
content = re.sub(r'device_limit:\s*Number\(deviceLimit\),', '', content)

# 2. Remove tenantPatch object completely from onSubmit calls if it exists
content = re.sub(r'const tenantPatch = \{[\s\S]*?\};\s*onSubmit\(\{ role \}, tenantPatch\);', 'onSubmit({ role });', content)

# 3. Clean up the JSX form controls
content = re.sub(r'<label className="block text-xs font-medium text-zinc-600">\s*Subscription Plan\s*<Select[\s\S]*?</Select>\s*</label>', '', content)
content = re.sub(r'<label className="block text-xs font-medium text-zinc-600">\s*Max Device Limit\s*<Input[\s\S]*?</label>', '', content)
content = re.sub(r'<label className="block text-xs font-medium text-zinc-600">\s*Expiration Date\s*<Input[\s\S]*?</label>', '', content)
content = re.sub(r'\{tenantSub && \([\s\S]*?\}\)', '', content)
content = re.sub(r'\{planId !== "free" && !expiry && \([\s\S]*?\}\)', '', content)

# 4. In TenantFormDialog (wait, the error logs had line 2447 subscriptionExpiresAt: planId === "free" ? null : (expiry ? new Date(expiry).toISOString() : null)
# Wait, TenantFormDialog might also have it? Yes! Let's check the error logs:
# components/data-table/operations-pages.tsx:2447:64 - error TS2304: Cannot find name 'expiry'.
# components/data-table/operations-pages.tsx:2502:20 - error TS2304: Cannot find name 'expiry'.
# This means TenantFormDialog ALSO has planId, expiry, deviceLimit!
