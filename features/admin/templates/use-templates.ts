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

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: templatesApi.createTemplate,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.templates }),
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
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.templates }),
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: templatesApi.deleteTemplate,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.templates }),
  });
}

export function useTemplateShowcaseSettings() {
  return useQuery<
    Awaited<ReturnType<typeof templatesApi.getTemplateShowcaseSettings>>,
    Error
  >({
    queryKey: adminQueryKeys.templateShowcase,
    queryFn: templatesApi.getTemplateShowcaseSettings,
  });
}

export function useSetTemplateShowcase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isShowcase }: { id: string; isShowcase: boolean }) =>
      templatesApi.setTemplateShowcase(id, isShowcase),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.templates }),
  });
}

export function useReorderTemplates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: templatesApi.reorderTemplates,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.templates }),
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
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.templates }),
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
