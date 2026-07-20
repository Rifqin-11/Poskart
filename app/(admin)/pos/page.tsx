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
  // Keep the POS shell available when the package query has a transient
  // database/RLS failure. The client can still surface a recoverable state.
  const packageResult = await packagesPromise
    .then((packages) => ({ packages, error: null as string | null }))
    .catch((error: unknown) => {
      console.error("[pos] Failed to load POS packages", error);

      return {
        packages: [],
        error: "Paket POS tidak dapat dimuat. Muat ulang halaman untuk mencoba lagi.",
      };
    });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PosDashboard
        packages={packageResult.packages}
        initialLoadError={packageResult.error}
      />
    </HydrationBoundary>
  );
}
