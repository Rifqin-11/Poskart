import { SettingsPanel } from "@/features/admin/settings";
import { getAdminBootstrap } from "@/server/admin/bootstrap";
import { requireOrganizationMembershipAccess } from "@/server/admin/page-access";

export default async function SettingsPage() {
  await requireOrganizationMembershipAccess();
  const bootstrap = await getAdminBootstrap();
  return (
    <SettingsPanel
      initialAccount={bootstrap.userProfile}
      initialMemberRole={bootstrap.userRole}
    />
  );
}
