import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { TemplateManagement } from "@/features/admin/templates";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { getQueryClient } from "@/lib/query-client.server";
import { templateService } from "@/server/admin/template-service";
import { requireOrganizationSubscriptionAccess } from "@/server/admin/page-access";

export default async function TemplatesPage() {
  await requireOrganizationSubscriptionAccess("/templates");
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: adminQueryKeys.templates,
    queryFn: templateService.getTemplates,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TemplateManagement />
    </HydrationBoundary>
  );
}
