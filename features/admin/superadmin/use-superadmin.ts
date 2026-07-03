"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { superadminApi, type TenantInput } from "@/features/admin/superadmin/api";
import type { Organization } from "@/types/organization";

export function useTenants() {
  return useQuery<Organization[], Error>({
    queryKey: adminQueryKeys.organizations,
    queryFn: superadminApi.getOrganizations,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: TenantInput) => superadminApi.createOrganization(values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.organizations }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.organizations }),
  });
}

export function useProfiles() {
  return useQuery<Awaited<ReturnType<typeof superadminApi.getProfiles>>, Error>({
    queryKey: adminQueryKeys.profiles,
    queryFn: superadminApi.getProfiles,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: superadminApi.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.profiles });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.subscriptionStatus });
    },
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: superadminApi.deleteProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.profiles }),
  });
}
