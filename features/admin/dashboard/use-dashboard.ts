"use client";

import { useQuery } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { dashboardService } from "@/server/admin/dashboard-service";
import { subscriptionService } from "@/server/subscription/subscription-service";

export function useDashboardData() {
  return useQuery({
    queryKey: adminQueryKeys.dashboard,
    queryFn: dashboardService.getDashboard,
  });
}

export function useSubscriptionStatus() {
  return useQuery({
    queryKey: adminQueryKeys.subscriptionStatus,
    queryFn: subscriptionService.getStatus,
  });
}
