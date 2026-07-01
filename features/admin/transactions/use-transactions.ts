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

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: transactionsApi.updateTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: transactionsApi.deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard });
    },
  });
}

export function useDeleteTransactions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: transactionsApi.deleteTransactions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard });
    },
  });
}
