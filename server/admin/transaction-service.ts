import { adminRepository } from "@/server/admin/_shared/admin-repository";
import type { TransactionPatch } from "@/server/admin/_shared/admin-repository";

export { TransactionPatch };

export const transactionService = {
  getTransactions: adminRepository.transactions,
  getFailedPrintsByBooth: adminRepository.failedPrintsByBooth,
  retryPrint: adminRepository.retryPrint,
  updateTransaction: ({ id, patch }: { id: string; patch: TransactionPatch }) =>
    adminRepository.updateTransaction(id, patch),
  deleteTransaction: (id: string) => adminRepository.deleteTransaction(id),
};
