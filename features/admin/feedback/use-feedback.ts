"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { feedbackApi } from "@/features/admin/feedback/api";

export function useMyFeedback() {
  return useQuery({
    queryKey: adminQueryKeys.myFeedback,
    queryFn: feedbackApi.getMine,
  });
}

export function useSubmitFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: feedbackApi.submit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.myFeedback });
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.superAdminFeedback,
      });
    },
  });
}
