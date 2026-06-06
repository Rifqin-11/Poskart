import { PosDashboard } from "@/features/pos/pos-dashboard";
import { getPosSales } from "@/server/pos/pos-service";

export default async function PosPage() {
  const sales = await getPosSales();

  return <PosDashboard sales={sales} />;
}
