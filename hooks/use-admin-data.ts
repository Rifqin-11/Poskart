"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminService } from "@/lib/services/admin-service";
import { configService } from "@/lib/services/config-service";
import type { AppConfigRow } from "@/types/app-config";

export function useDashboardData() {
  return useQuery({ queryKey: ["dashboard"], queryFn: adminService.dashboard });
}

export function useTransactions() {
  return useQuery({ queryKey: ["transactions"], queryFn: adminService.transactions });
}

export function useBooths() {
  return useQuery({ queryKey: ["booths"], queryFn: adminService.booths });
}

export function useTemplates() {
  return useQuery({ queryKey: ["templates"], queryFn: adminService.templates });
}

export function usePricing() {
  return useQuery({ queryKey: ["pricing"], queryFn: adminService.pricing });
}

export function useTenants() {
  return useQuery({ queryKey: ["tenants"], queryFn: adminService.tenants });
}

export function useThemes() {
  return useQuery({ queryKey: ["themes"], queryFn: adminService.themes });
}

export function useAssets() {
  return useQuery({ queryKey: ["assets"], queryFn: adminService.assets });
}

export function useActiveLayoutSchema() {
  return useQuery({ queryKey: ["layout-schema", "default-photobooth"], queryFn: adminService.layoutSchema });
}

export function useAppConfig() {
  return useQuery({ queryKey: ["app-config"], queryFn: configService.get });
}

export function useSaveAppConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Omit<AppConfigRow, "id" | "updated_at">) =>
      configService.save(patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-config"] });
    },
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminService.createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof adminService.updateTemplate>[1] }) =>
      adminService.updateTemplate(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminService.deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

