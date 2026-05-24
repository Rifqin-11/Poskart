import re

with open('lib/services/admin-service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the profile fetching for organization_id
# We replace .from("profiles").select("organization_id") with .from("organization_members").select("organization_id")
# And we must also change .eq("id", user.id) or .eq("id", userData.user.id) to .eq("profile_id", ...)

# Find blocks like:
# .from("profiles")
# .select("organization_id")
# .eq("id", <something>)

pattern = r'\.from\("profiles"\)\s*\n\s*\.select\("organization_id"\)\s*\n\s*\.eq\("id",([^)]+)\)'
replacement = r'.from("organization_members")\n    .select("organization_id")\n    .eq("profile_id",\1)\n    .limit(1)'

new_content = re.sub(pattern, replacement, content)

with open('lib/services/admin-service.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Fixed profile organization_id lookups.")
