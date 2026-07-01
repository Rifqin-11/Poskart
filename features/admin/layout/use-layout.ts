"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { layoutApi } from "@/features/admin/layout/api";
import type { LayoutSchema } from "@/types/builder";

export function useActiveLayoutSchema() {
  return useQuery<Awaited<ReturnType<typeof layoutApi.getLayoutSchema>>, Error>({
    queryKey: adminQueryKeys.layoutSchema,
    queryFn: layoutApi.getLayoutSchema,
  });
}

export function useLayoutSchemas() {
  return useQuery<Awaited<ReturnType<typeof layoutApi.getLayoutSchemas>>, Error>({
    queryKey: adminQueryKeys.layoutSchemas,
    queryFn: layoutApi.getLayoutSchemas,
    // Poll every 30 s as fallback when Realtime is unavailable
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useActiveThemeStatistics(themeName: string | null) {
  return useQuery<Awaited<ReturnType<typeof layoutApi.getActiveThemeStatistics>>, Error>({
    queryKey: adminQueryKeys.activeThemeStatistics(themeName),
    queryFn: () =>
      layoutApi.getActiveThemeStatistics(themeName as string),
    enabled: Boolean(themeName),
  });
}

export function useSaveLayoutAsTheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      name,
      schema,
      existingId,
    }: {
      name: string;
      schema: LayoutSchema;
      existingId?: string | null;
    }) => layoutApi.saveLayoutAsTheme(name, schema, existingId ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.layoutSchema });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.layoutSchemas });
    },
  });
}

export function useSetActiveLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: layoutApi.setActiveLayout,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.layoutSchemas }),
  });
}

export function useDeactivateLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: layoutApi.deactivateLayout,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.layoutSchemas }),
  });
}

export function useDeleteLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: layoutApi.deleteLayout,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.layoutSchemas }),
  });
}
