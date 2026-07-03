import { PosDashboard } from "@/features/pos/pos-dashboard";
import { requireOrganizationFeatureAccess } from "@/server/admin/organization-feature-access";
import { getPosPackages, getPosSales } from "@/server/pos/pos-service";

export default async function PosPage() {
  await requireOrganizationFeatureAccess("posKasir");

  const [sales, packages] = await Promise.all([
    getPosSales(),
    getPosPackages(),
  ]);

  return <PosDashboard sales={sales} packages={packages} />;
}
