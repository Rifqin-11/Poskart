"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { transactionsApi } from "@/features/admin/transactions/api";

export function useTransactions() {
  return useQuery<Awaited<ReturnType<typeof transactionsApi.getTransactions>>, Error>({
    queryKey: adminQueryKeys.transactions,
    queryFn: transactionsApi.getTransactions,
  });
}

export function useFailedPrintsByBooth(boothName: string | null) {
  return useQuery<Awaited<ReturnType<typeof transactionsApi.getFailedPrintsByBooth>>, Error>({
    queryKey: adminQueryKeys.failedPrints(boothName),
    queryFn: () =>
      transactionsApi.getFailedPrintsByBooth(boothName as string),
    enabled: Boolean(boothName),
  });
}

export function useRetryPrint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: transactionsApi.retryPrint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: ["failed-prints"] });
      queryClient.invalidateQueries({ queryKey: ["active-device-print-jobs"] });
    },
  });
}

export function useRequestTransactionAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: transactionsApi.requestTransactionAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.transactions });
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.transactionActionRequests,
      });
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.adminNotifications,
      });
    },
  });
}

export function useTransactionActionRequests() {
  return useQuery<
    Awaited<ReturnType<typeof transactionsApi.getTransactionActionRequestsForSuperadmin>>,
    Error
  >({
    queryKey: adminQueryKeys.transactionActionRequests,
    queryFn: transactionsApi.getTransactionActionRequestsForSuperadmin,
  });
}

export function useReviewTransactionActionRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: transactionsApi.reviewTransactionActionRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard });
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.transactionActionRequests,
      });
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.adminNotifications,
      });
    },
  });
}
