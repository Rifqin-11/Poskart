import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { ShowcaseManagement } from "@/features/admin/showcases/showcase-management";
import { getQueryClient } from "@/lib/query-client.server";
import { layoutService } from "@/server/admin/layout-service";
import { requireOrganizationSubscriptionAccess } from "@/server/admin/page-access";
import { requireOrganizationFeatureAccess } from "@/server/admin/organization-feature-access";
import { showcaseService } from "@/server/admin/showcase-service";
import { templateService } from "@/server/admin/template-service";

export default async function ShowcasePage() {
  await requireOrganizationSubscriptionAccess("/showcase");
  await requireOrganizationFeatureAccess("showcase");
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: adminQueryKeys.showcases,
      queryFn: showcaseService.getShowcases,
    }),
    queryClient.prefetchQuery({
      queryKey: adminQueryKeys.templates,
      queryFn: templateService.getTemplates,
    }),
    queryClient.prefetchQuery({
      queryKey: adminQueryKeys.layoutSchemas,
      queryFn: layoutService.getLayoutSchemas,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ShowcaseManagement />
    </HydrationBoundary>
  );
}
