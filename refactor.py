import os
import re

dirs_to_scan = ['lib', 'hooks', 'types', 'components']
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
    # Fix import paths since we renamed the files
    (r'types/tenant', 'types/organization'),
    (r'types/booth', 'types/device')
]

for d in dirs_to_scan:
    for root, dirs, files in os.walk(d):
        for file in files:
            if file.endswith('.ts') or file.endswith('.tsx'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = content
                for pattern, repl in replacements:
                    new_content = re.sub(pattern, repl, new_content)
                
                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated {path}")

print("Done refactoring.")
