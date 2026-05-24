import re

replacements = [
    (r'\btenants\b', 'organizations'),
    (r'\btenant\b', 'organization'),
    (r'\bTenants\b', 'Organizations'),
    (r'\bTenant\b', 'Organization'),
    (r'\bbooths\b', 'devices'),
    (r'\bbooth\b', 'device'),
    (r'\bBooths\b', 'Devices'),
    (r'\bBooth\b', 'Device'),
    (r'\bTENANT\b', 'ORGANIZATION'),
    (r'\bBOOTH\b', 'DEVICE'),
    (r'tenant_id', 'organization_id'),
    (r'get_auth_tenant_id', 'get_auth_organization_id'),
    (r'types/tenant', 'types/organization'),
    (r'types/booth', 'types/device')
]

path = 'components/data-table/operations-pages.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

for pattern, repl in replacements:
    content = re.sub(pattern, repl, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed operations-pages.tsx")
