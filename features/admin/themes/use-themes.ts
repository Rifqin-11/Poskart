"use client";

import { useQuery } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { layoutApi } from "@/features/admin/layout/api";

export function useThemes() {
  return useQuery<Awaited<ReturnType<typeof layoutApi.getThemes>>, Error>({
    queryKey: adminQueryKeys.themes,
    queryFn: layoutApi.getThemes,
  });
}
