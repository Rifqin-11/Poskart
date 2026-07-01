"use client";

import { useQuery } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { dashboardApi } from "@/features/admin/dashboard/api";

export function useDashboardData() {
  return useQuery<Awaited<ReturnType<typeof dashboardApi.getDashboard>>, Error>({
    queryKey: adminQueryKeys.dashboard,
    queryFn: dashboardApi.getDashboard,
    staleTime: 2 * 60 * 1000, // 2 minutes — avoids re-fetch on every navigation
    gcTime: 5 * 60 * 1000,
  });
}

export function useSubscriptionStatus() {
  return useQuery<Awaited<ReturnType<typeof dashboardApi.getSubscriptionStatus>>, Error>({
    queryKey: adminQueryKeys.subscriptionStatus,
    queryFn: dashboardApi.getSubscriptionStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes — subscription status rarely changes
    gcTime: 10 * 60 * 1000,
  });
}
