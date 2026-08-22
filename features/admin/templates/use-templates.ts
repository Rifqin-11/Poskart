"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { templatesApi } from "@/features/admin/templates/api";

export function useTemplates() {
  return useQuery<Awaited<ReturnType<typeof templatesApi.getTemplates>>, Error>(
    {
      queryKey: adminQueryKeys.templates,
      queryFn: templatesApi.getTemplates,
    },
  );
}

export function useFrameUsageInsights(
  period: "7d" | "30d" | "90d" | "all",
  enabled = true,
) {
  return useQuery<
    Awaited<ReturnType<typeof templatesApi.getFrameUsageInsights>>,
    Error
  >({
    queryKey: adminQueryKeys.frameInsights(period),
    queryFn: () => templatesApi.getFrameUsageInsights(period),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: templatesApi.createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.templates });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.frameInsightsRoot });
    },
  });
}

export function useAssignTemplateToDevices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, deviceIds }: { templateId: string; deviceIds: string[] }) =>
      templatesApi.assignTemplateToDevices(templateId, deviceIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.devices });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.templates });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.frameInsightsRoot });
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
      patch: Parameters<typeof templatesApi.updateTemplate>[1];
    }) => templatesApi.updateTemplate(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.templates });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.frameInsightsRoot });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: templatesApi.deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.templates });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.frameInsightsRoot });
    },
  });
}

export function useReorderTemplates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: templatesApi.reorderTemplates,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.templates });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.frameInsightsRoot });
    },
  });
}

export function useMoveTemplateToFrameCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      frameCategoryId,
      templateIds,
    }: {
      templateId: string;
      frameCategoryId: string | null;
      templateIds: string[];
    }) =>
      templatesApi.moveTemplateToFrameCategory(
        templateId,
        frameCategoryId,
        templateIds,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.templates });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.frameInsightsRoot });
    },
  });
}

export function useFrameCategories() {
  return useQuery<
    Awaited<ReturnType<typeof templatesApi.getFrameCategories>>,
    Error
  >({
    queryKey: adminQueryKeys.frameCategories,
    queryFn: templatesApi.getFrameCategories,
  });
}

export function useReorderFrameCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: templatesApi.reorderFrameCategories,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.frameCategories,
      }),
  });
}

export function useCreateFrameCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: templatesApi.createFrameCategory,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.frameCategories,
      }),
  });
}

export function useUpdateFrameCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      templatesApi.updateFrameCategory(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.frameCategories,
      });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.templates });
    },
  });
}

export function useDeleteFrameCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: templatesApi.deleteFrameCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.frameCategories,
      });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.templates });
    },
  });
}
