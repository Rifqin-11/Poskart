"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { configService } from "@/server/config/config-service";
import type { AppConfigRow } from "@/types/app-config";

export function useAppConfig() {
  return useQuery({
    queryKey: adminQueryKeys.appConfig,
    queryFn: configService.get,
  });
}

export function useSaveAppConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Omit<AppConfigRow, "id" | "updated_at">) =>
      configService.save(patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.appConfig }),
  });
}
