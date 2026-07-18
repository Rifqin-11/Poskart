import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { PosDashboard } from "@/features/pos/pos-dashboard";
import { DEFAULT_POS_SALE_FILTERS } from "@/features/pos/pos-list-defaults";
import { getQueryClient } from "@/lib/query-client.server";
import { requireOrganizationFeatureAccess } from "@/server/admin/organization-feature-access";
import { getPosPackages, getPosSalesPage } from "@/server/pos/pos-service";

export default async function PosPage() {
  await requireOrganizationFeatureAccess("posKasir");

  const queryClient = getQueryClient();
  const packagesPromise = getPosPackages();
  await queryClient.prefetchQuery({
    queryKey: adminQueryKeys.posSales(DEFAULT_POS_SALE_FILTERS),
    queryFn: () => getPosSalesPage(DEFAULT_POS_SALE_FILTERS),
  });
  const packages = await packagesPromise;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PosDashboard packages={packages} />
    </HydrationBoundary>
  );
}
