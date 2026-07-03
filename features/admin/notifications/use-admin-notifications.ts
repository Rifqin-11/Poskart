"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { adminNotificationsApi } from "@/features/admin/notifications/api";

export function useAdminNotifications() {
  return useQuery({
    queryKey: adminQueryKeys.adminNotifications,
    queryFn: adminNotificationsApi.getMyAdminNotifications,
    refetchInterval: 30_000,
  });
}

export function useMarkAdminNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminNotificationsApi.markMyAdminNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.adminNotifications,
      });
    },
  });
}
