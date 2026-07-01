"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { assetsApi, type AssetInput, type AssetItem } from "@/features/admin/assets/api";

export function useAssets() {
  return useQuery<AssetItem[], Error>({
    queryKey: adminQueryKeys.assets,
    queryFn: assetsApi.getAssets,
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: AssetInput) => assetsApi.createAsset(values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.assets }),
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<AssetInput> }) =>
      assetsApi.updateAsset(id, patch),
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
    }) => assetsApi.deleteAsset(id, storagePath),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.assets }),
  });
}
