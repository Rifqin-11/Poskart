import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { BoothManagement } from "@/features/admin/devices";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { getQueryClient } from "@/lib/query-client.server";
import { deviceService } from "@/server/admin/device-service";
import { requireOrganizationSubscriptionAccess } from "@/server/admin/page-access";

export default async function BoothsPage() {
  await requireOrganizationSubscriptionAccess("/devices");
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: adminQueryKeys.devices,
    queryFn: deviceService.getDevices,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BoothManagement />
    </HydrationBoundary>
  );
}
