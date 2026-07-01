"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { templatesApi } from "@/features/admin/templates/api";

export function useTemplates() {
  return useQuery<Awaited<ReturnType<typeof templatesApi.getTemplates>>, Error>({
    queryKey: adminQueryKeys.templates,
    queryFn: templatesApi.getTemplates,
  });
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

export function useReorderTemplates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: templatesApi.reorderTemplates,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.templates }),
  });
}
