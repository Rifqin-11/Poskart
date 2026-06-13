"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { layoutService } from "@/server/admin/layout-service";
import type { LayoutSchema } from "@/types/builder";

export function useActiveLayoutSchema() {
  return useQuery({
    queryKey: adminQueryKeys.layoutSchema,
    queryFn: layoutService.getLayoutSchema,
  });
}

export function useLayoutSchemas() {
  return useQuery({
    queryKey: adminQueryKeys.layoutSchemas,
    queryFn: layoutService.getLayoutSchemas,
    // Poll every 30 s as fallback when Realtime is unavailable
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useActiveThemeStatistics(themeName: string | null) {
  return useQuery({
    queryKey: adminQueryKeys.activeThemeStatistics(themeName),
    queryFn: () =>
      layoutService.getActiveThemeStatistics(themeName as string),
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
    }) => layoutService.saveLayoutAsTheme(name, schema, existingId ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.layoutSchema });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.layoutSchemas });
    },
  });
}

export function useSetActiveLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: layoutService.setActiveLayout,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.layoutSchemas }),
  });
}

export function useDeactivateLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: layoutService.deactivateLayout,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.layoutSchemas }),
  });
}

export function useDeleteLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: layoutService.deleteLayout,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.layoutSchemas }),
  });
}
