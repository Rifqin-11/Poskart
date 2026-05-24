"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminService } from "@/lib/services/admin-service";
import type {
  AssetInput,
  BoothInput,
  PricingProductInput,
  TenantInput,
} from "@/lib/services/admin-service";
import { configService } from "@/lib/services/config-service";
import type { AppConfigRow } from "@/types/app-config";
import type { LayoutSchema } from "@/types/builder";

export function useDashboardData() {
  return useQuery({ queryKey: ["dashboard"], queryFn: adminService.dashboard });
}

export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: adminService.transactions,
  });
}

export function useFailedPrintsByBooth(boothName: string | null) {
  return useQuery({
    queryKey: ["failed-prints", boothName],
    queryFn: () => adminService.failedPrintsByBooth(boothName as string),
    enabled: Boolean(boothName),
  });
}

export function useRetryPrint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transactionId: string) =>
      adminService.retryPrint(transactionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["failed-prints"] });
    },
  });
}

export function useBooths() {
  return useQuery({ queryKey: ["devices"], queryFn: adminService.devices });
}

export function useTemplates() {
  return useQuery({ queryKey: ["templates"], queryFn: adminService.templates });
}

export function usePricing() {
  return useQuery({ queryKey: ["pricing"], queryFn: adminService.pricing });
}

export function useTenants() {
  return useQuery({ queryKey: ["organizations"], queryFn: adminService.organizations });
}

export function useThemes() {
  return useQuery({ queryKey: ["themes"], queryFn: adminService.themes });
}

export function useAssets() {
  return useQuery({ queryKey: ["assets"], queryFn: adminService.assets });
}

export function useActiveLayoutSchema() {
  return useQuery({
    queryKey: ["layout-schema", "default-photobooth"],
    queryFn: adminService.layoutSchema,
  });
}

export function useLayoutSchemas() {
  return useQuery({
    queryKey: ["layout-schemas"],
    queryFn: adminService.layoutSchemas,
  });
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
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Parameters<typeof adminService.updateTemplate>[1];
    }) => adminService.updateTemplate(id, patch),
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

// ── Pricing ────────────────────────────────────────────────
export function useCreatePricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: PricingProductInput) =>
      adminService.createPricingProduct(values),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing"] }),
  });
}

export function useUpdatePricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<PricingProductInput>;
    }) => adminService.updatePricingProduct(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing"] }),
  });
}

export function useDeletePricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.deletePricingProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing"] }),
  });
}

// ── Devices ─────────────────────────────────────────────────
export function useCreateBooth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: BoothInput) => adminService.createBooth(values),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
  });
}

export function useUpdateBooth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<BoothInput> }) =>
      adminService.updateBooth(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
  });
}

export function useDeleteBooth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.deleteBooth(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
  });
}

// ── Organizations ────────────────────────────────────────────────
export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: TenantInput) => adminService.createTenant(values),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organizations"] }),
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TenantInput> }) =>
      adminService.updateTenant(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organizations"] }),
  });
}

export function useDeleteTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.deleteTenant(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organizations"] }),
  });
}

// ── Assets ─────────────────────────────────────────────────
export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: AssetInput) => adminService.createAsset(values),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<AssetInput> }) =>
      adminService.updateAsset(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      storagePath,
    }: {
      id: string;
      storagePath?: string | null;
    }) => adminService.deleteAsset(id, storagePath),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
}

export function useSaveLayoutAsTheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      name,
      schema,
      existingId,
    }: {
      name: string;
      schema: LayoutSchema;
      existingId?: string;
    }) => adminService.saveLayoutAsTheme(name, schema, existingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["layout-schemas"] });
    },
  });
}

export function useSetActiveLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.setActiveLayout(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["layout-schemas"] });
    },
  });
}

export function useDeactivateLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.deactivateLayout(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["layout-schemas"] });
    },
  });
}

export function useDeleteLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.deleteLayout(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["layout-schemas"] });
    },
  });
}

export function useSubscriptionStatus() {
  return useQuery({
    queryKey: ["subscription-status"],
    queryFn: adminService.getSubscriptionStatus,
  });
}

export function useSubscriptionOrders() {
  return useQuery({
    queryKey: ["subscription-orders"],
    queryFn: adminService.getSubscriptionOrders,
  });
}

export function useUpdateSubscriptionOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminService.updateSubscriptionOrderStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-orders"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
    },
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: adminService.getProfiles,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminService.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
    },
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminService.deleteProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
  });
}

export function useTenantDetails() {
  return useQuery({
    queryKey: ["organization-details"],
    queryFn: adminService.getMyTenantDetails,
  });
}

export function useUpdateTenantName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminService.updateMyTenantName,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-details"] });
    },
  });
}

export function useTenantMembers() {
  return useQuery({
    queryKey: ["organization-members"],
    queryFn: adminService.getMyTenantMembers,
  });
}

export function useTenantInvitations() {
  return useQuery({
    queryKey: ["organization-invitations"],
    queryFn: adminService.getMyTenantInvitations,
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminService.inviteUserToTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
      queryClient.invalidateQueries({ queryKey: ["organization-invitations"] });
    },
  });
}

export function useDeleteInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminService.deleteTenantInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-invitations"] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminService.removeMemberFromTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
    },
  });
}
