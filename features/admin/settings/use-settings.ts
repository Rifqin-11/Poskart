"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { settingsApi } from "@/features/admin/settings/api";
import type { AppConfigRow } from "@/types/app-config";

export function useAppConfig(enabled = true) {
  return useQuery<Awaited<ReturnType<typeof settingsApi.getAppConfig>>, Error>({
    queryKey: adminQueryKeys.appConfig,
    queryFn: settingsApi.getAppConfig,
    staleTime: 5 * 60_000,
    enabled,
  });
}

export function useSaveAppConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Omit<AppConfigRow, "id" | "updated_at">) =>
      settingsApi.saveAppConfig(patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.appConfig }),
  });
}
