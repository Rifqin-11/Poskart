import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { BoothManagement } from "@/features/admin/devices";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { getQueryClient } from "@/lib/query-client.server";
import { deviceService } from "@/server/admin/device-service";
import { requireOrganizationSubscriptionAccess } from "@/server/admin/page-access";

export default async function BoothsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOrganizationSubscriptionAccess("/devices");
  const params = await searchParams;
  const initialAction =
    typeof params.action === "string" ? params.action : undefined;
  const initialDeviceId =
    typeof params.device === "string" ? params.device : undefined;
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: adminQueryKeys.devices,
    queryFn: deviceService.getDevices,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BoothManagement
        initialAction={initialAction}
        initialDeviceId={initialDeviceId}
      />
    </HydrationBoundary>
  );
}
