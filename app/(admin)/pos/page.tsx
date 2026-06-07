import { PosDashboard } from "@/features/pos/pos-dashboard";
import { getPosPackages, getPosSales } from "@/server/pos/pos-service";

export default async function PosPage() {
  const [sales, packages] = await Promise.all([
    getPosSales(),
    getPosPackages(),
  ]);

  return <PosDashboard sales={sales} packages={packages} />;
}
