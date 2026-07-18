import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { DashboardOverview } from "@/features/admin/dashboard/dashboard-overview";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { getQueryClient } from "@/lib/query-client.server";
import { dashboardService } from "@/server/admin/dashboard-service";
import { connection } from "next/server";

export default async function DashboardPage() {
  await connection();

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: adminQueryKeys.dashboard,
    queryFn: dashboardService.getDashboard,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardOverview />
    </HydrationBoundary>
  );
}
