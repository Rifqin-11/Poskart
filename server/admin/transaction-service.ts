import { adminRepository } from "@/server/admin/_shared/admin-repository";

export const transactionService = {
  getTransactions: adminRepository.transactions,
  getFailedPrintsByBooth: adminRepository.failedPrintsByBooth,
  retryPrint: adminRepository.retryPrint,
};
