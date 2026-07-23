"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { organizationApi } from "@/features/admin/organization/api";

export function useTenantDetails(enabled = true) {
  return useQuery<Awaited<ReturnType<typeof organizationApi.getMyOrganizationDetails>>, Error>({
    queryKey: adminQueryKeys.organizationDetails,
    queryFn: organizationApi.getMyOrganizationDetails,
    staleTime: 5 * 60_000,
    enabled,
  });
}

export function useUpdateTenantName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationApi.updateMyOrganizationName,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.organizationDetails });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.subscriptionStatus });
    },
  });
}

export function useUpdatePaymentCollectionMode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationApi.updateMyPaymentCollectionMode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.organizationDetails });
    },
  });
}

export function usePaymentGatewaySettings(enabled = true) {
  return useQuery<
    Awaited<ReturnType<typeof organizationApi.getMyPaymentGatewaySettings>>,
    Error
  >({
    queryKey: adminQueryKeys.organizationPaymentGateway,
    queryFn: organizationApi.getMyPaymentGatewaySettings,
    staleTime: 2 * 60_000,
    enabled,
  });
}

export function useSavePaymentGatewaySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationApi.saveMyPaymentGatewaySettings,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.organizationPaymentGateway,
      });
    },
  });
}

export function useTenantMembers(enabled = true) {
  return useQuery<Awaited<ReturnType<typeof organizationApi.getMyOrganizationMembers>>, Error>({
    queryKey: adminQueryKeys.organizationMembers,
    queryFn: organizationApi.getMyOrganizationMembers,
    staleTime: 2 * 60_000,
    enabled,
  });
}

export function useTenantInvitations() {
  return useQuery<Awaited<ReturnType<typeof organizationApi.getMyOrganizationInvitations>>, Error>({
    queryKey: adminQueryKeys.organizationInvitations,
    queryFn: organizationApi.getMyOrganizationInvitations,
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationApi.inviteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.organizationMembers });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.organizationInvitations });
    },
  });
}

export function useDeleteInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationApi.deleteInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.organizationInvitations }),
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationApi.removeMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.organizationMembers }),
  });
}

export function useLeaveOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationApi.leaveOrganization,
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/onboarding";
    },
  });
}

export function useTransferOwnership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationApi.transferOwnership,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.organizationMembers });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      organizationApi.updateMemberRole(memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.organizationMembers });
    },
  });
}

export function usePendingJoinRequests() {
  return useQuery<Awaited<ReturnType<typeof organizationApi.getPendingJoinRequests>>, Error>({
    queryKey: adminQueryKeys.organizationJoinRequests,
    queryFn: organizationApi.getPendingJoinRequests,
  });
}

export function useAcceptJoinRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationApi.acceptJoinRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.organizationJoinRequests });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.organizationMembers });
    },
  });
}

export function useRejectJoinRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationApi.rejectJoinRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.organizationJoinRequests });
    },
  });
}
