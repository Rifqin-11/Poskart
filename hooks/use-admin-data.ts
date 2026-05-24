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

// ── Booths ─────────────────────────────────────────────────
export function useCreateBooth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: BoothInput) => adminService.createBooth(values),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["booths"] }),
  });
}

export function useUpdateBooth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<BoothInput> }) =>
      adminService.updateBooth(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["booths"] }),
  });
}

export function useDeleteBooth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.deleteBooth(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["booths"] }),
  });
}

// ── Tenants ────────────────────────────────────────────────
export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: TenantInput) => adminService.createTenant(values),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenants"] }),
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TenantInput> }) =>
      adminService.updateTenant(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenants"] }),
  });
}

export function useDeleteTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.deleteTenant(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenants"] }),
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
