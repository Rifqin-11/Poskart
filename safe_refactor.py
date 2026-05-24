with open('components/data-table/operations-pages.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Extract Subscription tab content
sub_start = '<TabsContent value="subscription" className="space-y-4">'
sub_end = '          </Card>\n        </TabsContent>'
sub_idx_start = content.find(sub_start)
sub_idx_end = content.find(sub_end, sub_idx_start) + len(sub_end)

sub_content = content[sub_idx_start:sub_idx_end]
sub_content = sub_content.replace('<TabsContent value="subscription" className="space-y-4">', '')
sub_content = sub_content.replace('</TabsContent>', '')

# 2. Extract Organization tab content
org_start = '<TabsContent value="organization">'
org_end = '          <OrganizationSettings />\n        </TabsContent>'
org_idx_start = content.find(org_start)
org_idx_end = content.find(org_end, org_idx_start) + len(org_end)

# 3. Remove them from original SettingsPanel
content = content[:sub_idx_start] + content[org_idx_end:]

# 4. Remove triggers
content = content.replace('<TabsTrigger value="subscription">Subscription</TabsTrigger>', '')
content = content.replace('<TabsTrigger value="organization">Organization</TabsTrigger>', '')

# 5. Inject OrganizationPanel
org_panel_code = f"""
export function OrganizationPanel() {{
  const {{ data: sub }} = useSubscriptionStatus();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Management"
        description="Manage your subscription plan, organization details, and team members."
      />
      {sub_content}
      <OrganizationSettings />
    </div>
  );
}}
"""

content = content.replace('export function SettingsPanel() {', org_panel_code + '\nexport function SettingsPanel() {')

with open('components/data-table/operations-pages.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Safe refactor complete")
