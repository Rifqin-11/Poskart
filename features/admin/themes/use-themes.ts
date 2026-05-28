"use client";

import { useQuery } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { layoutService } from "@/server/admin/layout-service";

export function useThemes() {
  return useQuery({
    queryKey: adminQueryKeys.themes,
    queryFn: layoutService.getThemes,
  });
}
