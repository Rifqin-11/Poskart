"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getPosSalesPageAction } from "@/app/(admin)/pos/actions";
import { adminQueryKeys } from "@/features/admin/query-keys";
import type { PosSaleFilters, PosSalesPage } from "@/types/pos";

export function usePosSales(filters: PosSaleFilters) {
  return useQuery<PosSalesPage, Error>({
    queryKey: adminQueryKeys.posSales(filters),
    queryFn: () => getPosSalesPageAction(filters),
    placeholderData: keepPreviousData,
  });
}
