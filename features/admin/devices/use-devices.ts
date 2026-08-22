"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { devicesApi, type BoothInput } from "@/features/admin/devices/api";
import type { Device } from "@/types/device";
import type { DeviceErrorGroup } from "@/types/device-error";

export function useBooths(options?: { enabled?: boolean }) {
  return useQuery<Device[], Error>({
    queryKey: adminQueryKeys.devices,
    queryFn: devicesApi.getDevices,
    enabled: options?.enabled ?? true,
    // Re-evaluate stale heartbeats shortly after the five-minute offline
    // threshold, even when a disconnected kiosk can no longer emit realtime.
    refetchInterval: 60_000,
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

export function useCreatePairedBooth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pairingId, values }: { pairingId: string; values: BoothInput }) =>
      devicesApi.createPairedDevice(pairingId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.devices }),
  });
}

export function useValidateDevicePairing() {
  return useMutation({
    mutationFn: (code: string) => devicesApi.validateDevicePairingCode(code),
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

export function useDeviceErrors(deviceId: string | null) {
  return useQuery<DeviceErrorGroup[], Error>({
    queryKey: adminQueryKeys.deviceErrors(deviceId),
    queryFn: () => devicesApi.getDeviceErrors(deviceId as string),
    enabled: Boolean(deviceId),
    refetchInterval: deviceId ? 30_000 : false,
    refetchOnWindowFocus: true,
  });
}

export function useSetDeviceErrorResolved() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      errorId,
      resolved,
    }: {
      errorId: string;
      resolved: boolean;
    }) => devicesApi.setDeviceErrorResolved(errorId, resolved),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-errors"] });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.devices });
    },
  });
}

export function useSendDeviceErrorToDeveloper() {
  return useMutation({
    mutationFn: ({ deviceId, errorId }: { deviceId: string; errorId: string }) =>
      devicesApi.sendDeviceErrorToDeveloper(deviceId, errorId),
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
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.transactionsRoot });
      queryClient.invalidateQueries({ queryKey: ["failed-prints"] });
    },
  });
}
