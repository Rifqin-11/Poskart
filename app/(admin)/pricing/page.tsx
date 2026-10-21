import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { PricingManagement } from "@/features/admin/pricing";
import { PricingPromotionNav } from "@/features/admin/pricing/pricing-promotion-nav";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { getQueryClient } from "@/lib/query-client.server";
import { pricingService } from "@/server/admin/pricing-service";
import { requireOrganizationMembershipAccess } from "@/server/admin/page-access";

export default async function AdminPricingPage() {
  await requireOrganizationMembershipAccess();
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: adminQueryKeys.pricing,
    queryFn: pricingService.getPricingProducts,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PricingPromotionNav />
      <PricingManagement />
    </HydrationBoundary>
  );
}
