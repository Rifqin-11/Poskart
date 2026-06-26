"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { subscriptionService } from "@/server/subscription/subscription-service";

export function useSubscriptionStatus() {
  return useQuery<Awaited<ReturnType<typeof subscriptionService.getStatus>>, Error>({
    queryKey: adminQueryKeys.subscriptionStatus,
    queryFn: subscriptionService.getStatus,
  });
}

export function useSubscriptionOrders() {
  return useQuery<Awaited<ReturnType<typeof subscriptionService.getOrders>>, Error>({
    queryKey: adminQueryKeys.subscriptionOrders,
    queryFn: subscriptionService.getOrders,
  });
}

export function useUpdateSubscriptionOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscriptionService.updateOrderStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.subscriptionOrders });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.subscriptionStatus });
    },
  });
}
