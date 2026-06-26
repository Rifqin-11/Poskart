import {
  getTransactions,
  getFailedPrintsByBooth,
  retryPrint,
  updateTransaction,
  deleteTransaction,
  deleteTransactions,
} from "@/server/admin/actions/transaction-actions";
import type { TransactionPatch } from "@/server/admin/_shared/admin-types";

export type { TransactionPatch };

export const transactionService = {
  getTransactions,
  getFailedPrintsByBooth,
  retryPrint,
  updateTransaction: ({ id, patch }: { id: string; patch: TransactionPatch }) =>
    updateTransaction(id, patch),
  deleteTransaction: (id: string) => deleteTransaction(id),
  deleteTransactions: (ids: string[]) => deleteTransactions(ids),
};
