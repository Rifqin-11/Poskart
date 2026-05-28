"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { pricingService } from "@/server/admin/pricing-service";
import type {
  PricingProductInput,
  SubscriptionPlanInput,
} from "@/server/admin/_shared/admin-repository";

export function usePricing() {
  return useQuery({
    queryKey: adminQueryKeys.pricing,
    queryFn: pricingService.getPricingProducts,
  });
}

export function useCreatePricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pricingService.createPricingProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.pricing }),
  });
}

export function useUpdatePricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<PricingProductInput> }) =>
      pricingService.updatePricingProduct(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.pricing }),
  });
}

export function useDeletePricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pricingService.deletePricingProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.pricing }),
  });
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: adminQueryKeys.subscriptionPlans,
    queryFn: pricingService.getSubscriptionPlans,
  });
}

export function useUpdateSubscriptionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: SubscriptionPlanInput }) =>
      pricingService.updateSubscriptionPlan(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.subscriptionPlans });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.subscriptionStatus });
    },
  });
}
