"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import type {
  PricingProductInput,
  SubscriptionPlanInput,
} from "@/features/admin/pricing/api";
import { pricingApi } from "@/features/admin/pricing/api";

export function usePricing() {
  return useQuery<Awaited<ReturnType<typeof pricingApi.getPricingProducts>>, Error>({
    queryKey: adminQueryKeys.pricing,
    queryFn: pricingApi.getPricingProducts,
  });
}

export function useCreatePricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pricingApi.createPricingProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.pricing }),
  });
}

export function useUpdatePricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<PricingProductInput> }) =>
      pricingApi.updatePricingProduct(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.pricing }),
  });
}

export function useDeletePricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pricingApi.deletePricingProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.pricing }),
  });
}

export function useSubscriptionPlans() {
  return useQuery<Awaited<ReturnType<typeof pricingApi.getSubscriptionPlans>>, Error>({
    queryKey: adminQueryKeys.subscriptionPlans,
    queryFn: pricingApi.getSubscriptionPlans,
  });
}

export function useUpdateSubscriptionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: SubscriptionPlanInput }) =>
      pricingApi.updateSubscriptionPlan(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.subscriptionPlans });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.subscriptionStatus });
    },
  });
}
