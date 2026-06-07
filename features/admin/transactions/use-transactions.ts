"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { transactionService } from "@/server/admin/transaction-service";
import type { TransactionPatch } from "@/server/admin/transaction-service";

export function useTransactions() {
  return useQuery({
    queryKey: adminQueryKeys.transactions,
    queryFn: transactionService.getTransactions,
  });
}

export function useFailedPrintsByBooth(boothName: string | null) {
  return useQuery({
    queryKey: adminQueryKeys.failedPrints(boothName),
    queryFn: () => transactionService.getFailedPrintsByBooth(boothName as string),
    enabled: Boolean(boothName),
  });
}

export function useRetryPrint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: transactionService.retryPrint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: ["failed-prints"] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: transactionService.updateTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: transactionService.deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard });
    },
  });
}
