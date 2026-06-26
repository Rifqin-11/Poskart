"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { organizationService } from "@/server/admin/organization-service";

export function useTenantDetails() {
  return useQuery<Awaited<ReturnType<typeof organizationService.getMyOrganizationDetails>>, Error>({
    queryKey: adminQueryKeys.organizationDetails,
    queryFn: organizationService.getMyOrganizationDetails,
  });
}

export function useUpdateTenantName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationService.updateMyOrganizationName,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.organizationDetails });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.subscriptionStatus });
    },
  });
}

export function useTenantMembers() {
  return useQuery<Awaited<ReturnType<typeof organizationService.getMyOrganizationMembers>>, Error>({
    queryKey: adminQueryKeys.organizationMembers,
    queryFn: organizationService.getMyOrganizationMembers,
  });
}

export function useTenantInvitations() {
  return useQuery<Awaited<ReturnType<typeof organizationService.getMyOrganizationInvitations>>, Error>({
    queryKey: adminQueryKeys.organizationInvitations,
    queryFn: organizationService.getMyOrganizationInvitations,
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationService.inviteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.organizationMembers });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.organizationInvitations });
    },
  });
}

export function useDeleteInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationService.deleteInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.organizationInvitations }),
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationService.removeMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.organizationMembers }),
  });
}
