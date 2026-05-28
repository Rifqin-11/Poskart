"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { organizationService } from "@/server/admin/organization-service";
import { profileService } from "@/server/admin/profile-service";
import type { TenantInput } from "@/server/admin/_shared/admin-repository";

export function useTenants() {
  return useQuery({
    queryKey: adminQueryKeys.organizations,
    queryFn: organizationService.getOrganizations,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: TenantInput) => organizationService.createOrganization(values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.organizations }),
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TenantInput> }) =>
      organizationService.updateOrganization(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.organizations }),
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationService.deleteOrganization,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.organizations }),
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: adminQueryKeys.profiles,
    queryFn: profileService.getProfiles,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: profileService.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.profiles });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.subscriptionStatus });
    },
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: profileService.deleteProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.profiles }),
  });
}
