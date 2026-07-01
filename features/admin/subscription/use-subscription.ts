"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { subscriptionApi } from "@/features/admin/subscription/api";

export function useSubscriptionStatus() {
  return useQuery<Awaited<ReturnType<typeof subscriptionApi.getStatus>>, Error>({
    queryKey: adminQueryKeys.subscriptionStatus,
    queryFn: subscriptionApi.getStatus,
  });
}

export function useSubscriptionOrders() {
  return useQuery<Awaited<ReturnType<typeof subscriptionApi.getOrders>>, Error>({
    queryKey: adminQueryKeys.subscriptionOrders,
    queryFn: subscriptionApi.getOrders,
  });
}

export function useUpdateSubscriptionOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscriptionApi.updateOrderStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.subscriptionOrders });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.subscriptionStatus });
    },
  });
}
