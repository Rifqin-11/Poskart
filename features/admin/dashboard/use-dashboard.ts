"use client";

import { useQuery } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { dashboardService } from "@/server/admin/dashboard-service";
import { subscriptionService } from "@/server/subscription/subscription-service";

export function useDashboardData() {
  return useQuery<Awaited<ReturnType<typeof dashboardService.getDashboard>>, Error>({
    queryKey: adminQueryKeys.dashboard,
    queryFn: dashboardService.getDashboard,
    staleTime: 2 * 60 * 1000, // 2 minutes — avoids re-fetch on every navigation
    gcTime: 5 * 60 * 1000,
  });
}

export function useSubscriptionStatus() {
  return useQuery<Awaited<ReturnType<typeof subscriptionService.getStatus>>, Error>({
    queryKey: adminQueryKeys.subscriptionStatus,
    queryFn: subscriptionService.getStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes — subscription status rarely changes
    gcTime: 10 * 60 * 1000,
  });
}
