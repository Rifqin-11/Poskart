"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { assetService } from "@/server/admin/asset-service";
import type { AssetInput } from "@/server/admin/_shared/admin-repository";

export function useAssets() {
  return useQuery({
    queryKey: adminQueryKeys.assets,
    queryFn: assetService.getAssets,
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: AssetInput) => assetService.createAsset(values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.assets }),
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<AssetInput> }) =>
      assetService.updateAsset(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.assets }),
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      storagePath,
    }: {
      id: string;
      storagePath?: string | null;
    }) => assetService.deleteAsset(id, storagePath),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.assets }),
  });
}
