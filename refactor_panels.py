import re

with open('components/data-table/operations-pages.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove TabsTrigger for subscription and organization
content = re.sub(r'<TabsTrigger value="subscription">Subscription</TabsTrigger>\s*', '', content)
content = re.sub(r'<TabsTrigger value="organization">Organization</TabsTrigger>\s*', '', content)

# 2. Find TabsContent for subscription
sub_match = re.search(r'(<TabsContent value="subscription" className="space-y-4">.*?</TabsContent>)', content, re.DOTALL)
sub_content = sub_match.group(1) if sub_match else ""

# Remove TabsContent wrapper from sub_content
sub_card = re.sub(r'^<TabsContent[^>]*>\s*', '', sub_content)
sub_card = re.sub(r'\s*</TabsContent>$', '', sub_card)

# 3. Find TabsContent for organization
org_match = re.search(r'(<TabsContent value="organization">\s*<OrganizationSettings />\s*</TabsContent>)', content, re.DOTALL)

# 4. Remove both from SettingsPanel
if sub_match:
    content = content.replace(sub_match.group(1), '')
if org_match:
    content = content.replace(org_match.group(1), '')

# 5. Inject OrganizationPanel before SettingsPanel
org_panel_code = f"""
export function OrganizationPanel() {{
  const {{ data: sub }} = useSubscriptionStatus();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Management"
        description="Manage your subscription plan, organization details, and team members."
      />
      {sub_card}
      <OrganizationSettings />
    </div>
  );
}}
"""

content = content.replace('export function SettingsPanel() {', org_panel_code + '\nexport function SettingsPanel() {')

with open('components/data-table/operations-pages.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Refactored operations-pages.tsx successfully")
