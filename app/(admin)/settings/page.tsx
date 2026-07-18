import { SettingsPanel } from "@/features/admin/settings";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { getQueryClient } from "@/lib/query-client.server";
import { getAdminBootstrap } from "@/server/admin/bootstrap";
import {
  getMyOrganizationMembers,
  getMyPaymentGatewaySettings,
} from "@/server/admin/actions/organization-actions";
import { getServerAppConfig } from "@/server/config/config-reader";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export default async function SettingsPage() {
  const bootstrap = await getAdminBootstrap();
  const queryClient = getQueryClient();

  const prefetches: Array<Promise<void>> = [
    queryClient.prefetchQuery({
      queryKey: adminQueryKeys.appConfig,
      queryFn: getServerAppConfig,
    }),
    queryClient.prefetchQuery({
      queryKey: adminQueryKeys.organizationMembers,
      queryFn: getMyOrganizationMembers,
    }),
  ];

  if (
    bootstrap.isSuperAdmin ||
    bootstrap.userRole === "owner" ||
    bootstrap.userRole === "admin"
  ) {
    prefetches.push(queryClient.prefetchQuery({
      queryKey: adminQueryKeys.organizationPaymentGateway,
      queryFn: getMyPaymentGatewaySettings,
    }));
  }

  await Promise.all(prefetches);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SettingsPanel initialAccount={bootstrap.userProfile} />
    </HydrationBoundary>
  );
}
