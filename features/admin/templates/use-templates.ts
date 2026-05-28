"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { templateService } from "@/server/admin/template-service";

export function useTemplates() {
  return useQuery({
    queryKey: adminQueryKeys.templates,
    queryFn: templateService.getTemplates,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: templateService.createTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.templates }),
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
      patch: Parameters<typeof templateService.updateTemplate>[1];
    }) => templateService.updateTemplate(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.templates }),
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: templateService.deleteTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.templates }),
  });
}
