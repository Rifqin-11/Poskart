"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { devicesApi, type BoothInput } from "@/features/admin/devices/api";
import type { Device } from "@/types/device";

export function useBooths() {
  return useQuery<Device[], Error>({
    queryKey: adminQueryKeys.devices,
    queryFn: devicesApi.getDevices,
    // Poll every 30 s as fallback when Realtime is unavailable
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useCreateBooth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: BoothInput) => devicesApi.createDevice(values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.devices }),
  });
}

export function useUpdateBooth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<BoothInput> }) =>
      devicesApi.updateDevice(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.devices }),
  });
}

export function useDeleteBooth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => devicesApi.deleteDevice(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.devices }),
  });
}

export function useApproveVoucherRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, code }: { id: string; code?: string }) =>
      devicesApi.approveVoucherRequest(id, code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.devices }),
  });
}

export function useRejectVoucherRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => devicesApi.rejectVoucherRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.devices }),
  });
}

export function useFailedPrintsByBooth(boothName: string | null) {
  return useQuery<Awaited<ReturnType<typeof devicesApi.getFailedPrintsByBooth>>, Error>({
    queryKey: adminQueryKeys.failedPrints(boothName),
    queryFn: () => devicesApi.getFailedPrintsByBooth(boothName as string),
    enabled: Boolean(boothName),
  });
}

export function useRetryPrint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: devicesApi.retryPrint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: ["failed-prints"] });
    },
  });
}
