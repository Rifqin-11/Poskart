import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { PricingManagement } from "@/features/admin/pricing";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { getQueryClient } from "@/lib/query-client.server";
import { pricingService } from "@/server/admin/pricing-service";

export default async function AdminPricingPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: adminQueryKeys.pricing,
    queryFn: pricingService.getPricingProducts,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PricingManagement />
    </HydrationBoundary>
  );
}
