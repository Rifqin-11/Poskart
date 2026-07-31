"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { showcasesApi } from "@/features/admin/showcases/api";
import type { ShowcaseInput } from "@/types/showcase";

export function useShowcases() {
  return useQuery({
    queryKey: adminQueryKeys.showcases,
    queryFn: showcasesApi.getShowcases,
  });
}

export function useCreateShowcase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ShowcaseInput) => showcasesApi.createShowcase(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.showcases }),
  });
}

export function useUpdateShowcase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ShowcaseInput }) =>
      showcasesApi.updateShowcase(id, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.showcases }),
  });
}

export function useDeleteShowcase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: showcasesApi.deleteShowcase,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.showcases }),
  });
}
