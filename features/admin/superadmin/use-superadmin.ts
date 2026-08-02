"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import {
  superadminApi,
  type TenantInput,
} from "@/features/admin/superadmin/api";
import type { Organization } from "@/types/organization";
import type { TrialRequestFilters } from "@/types/trial";

export function useTenants() {
  return useQuery<Organization[], Error>({
    queryKey: adminQueryKeys.organizations,
    queryFn: superadminApi.getOrganizations,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: TenantInput) =>
      superadminApi.createOrganization(values),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.organizations }),
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TenantInput> }) =>
      superadminApi.updateOrganization(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.organizations });
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.organizationDetails,
      });
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: superadminApi.deleteOrganization,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.organizations }),
  });
}

export function useProfiles() {
  return useQuery<Awaited<ReturnType<typeof superadminApi.getProfiles>>, Error>(
    {
      queryKey: adminQueryKeys.profiles,
      queryFn: superadminApi.getProfiles,
    },
  );
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: superadminApi.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.profiles });
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.subscriptionStatus,
      });
    },
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: superadminApi.deleteProfile,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.profiles }),
  });
}

export function useSuperAdminDeviceErrors() {
  return useQuery<
    Awaited<ReturnType<typeof superadminApi.getDeviceErrors>>,
    Error
  >({
    queryKey: adminQueryKeys.superAdminDeviceErrors,
    queryFn: superadminApi.getDeviceErrors,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useSetSuperAdminDeviceErrorResolved() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      errorId,
      resolved,
    }: {
      errorId: string;
      resolved: boolean;
    }) => superadminApi.setDeviceErrorResolved(errorId, resolved),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.superAdminDeviceErrors,
      });
      queryClient.invalidateQueries({ queryKey: ["device-errors"] });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.devices });
    },
  });
}

export function useBroadcastAdminNotification() {
  return useMutation({
    mutationFn: superadminApi.broadcastAdminNotification,
  });
}

export function useSuperAdminNotifications() {
  return useQuery({
    queryKey: adminQueryKeys.superAdminNotifications,
    queryFn: superadminApi.getSuperAdminNotifications,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useDeleteSuperAdminNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: superadminApi.deleteSuperAdminNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.superAdminNotifications,
      });
    },
  });
}

export function useTrialRequests(filters: TrialRequestFilters = {}) {
  return useQuery({
    queryKey: adminQueryKeys.trialRequests(filters as Record<string, unknown>),
    queryFn: () => superadminApi.listTrialRequests(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useReviewTrialRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: superadminApi.reviewTrialRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.trialRequestsRoot });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.subscriptionStatus });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.myTrialRequest });
    },
  });
}

export function useRevokeTrialClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, reason }: { claimId: string; reason: string }) =>
      superadminApi.revokeTrialClaim(claimId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.trialRequestsRoot });
    },
  });
}

export function useRevokeTrialByRequestId() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason: string }) =>
      superadminApi.revokeTrialByRequestId(requestId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.trialRequestsRoot });
    },
  });
}
