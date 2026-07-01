"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { organizationApi } from "@/features/admin/organization/api";

export function useTenantDetails() {
  return useQuery<Awaited<ReturnType<typeof organizationApi.getMyOrganizationDetails>>, Error>({
    queryKey: adminQueryKeys.organizationDetails,
    queryFn: organizationApi.getMyOrganizationDetails,
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

export function useTenantMembers() {
  return useQuery<Awaited<ReturnType<typeof organizationApi.getMyOrganizationMembers>>, Error>({
    queryKey: adminQueryKeys.organizationMembers,
    queryFn: organizationApi.getMyOrganizationMembers,
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
