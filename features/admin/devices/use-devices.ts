"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { deviceService } from "@/server/admin/device-service";
import { transactionService } from "@/server/admin/transaction-service";
import type { BoothInput } from "@/server/admin/_shared/admin-repository";

export function useBooths() {
  return useQuery({
    queryKey: adminQueryKeys.devices,
    queryFn: deviceService.getDevices,
  });
}

export function useCreateBooth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: BoothInput) => deviceService.createDevice(values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.devices }),
  });
}

export function useUpdateBooth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<BoothInput> }) =>
      deviceService.updateDevice(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.devices }),
  });
}

export function useDeleteBooth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deviceService.deleteDevice(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.devices }),
  });
}

export function useFailedPrintsByBooth(boothName: string | null) {
  return useQuery({
    queryKey: adminQueryKeys.failedPrints(boothName),
    queryFn: () => transactionService.getFailedPrintsByBooth(boothName as string),
    enabled: Boolean(boothName),
  });
}

export function useRetryPrint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: transactionService.retryPrint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: ["failed-prints"] });
    },
  });
}
