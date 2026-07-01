import { transactionService } from "@/server/admin/transaction-service";

export const transactionsApi = {
  getTransactions: transactionService.getTransactions,
  getFailedPrintsByBooth: transactionService.getFailedPrintsByBooth,
  retryPrint: transactionService.retryPrint,
  updateTransaction: transactionService.updateTransaction,
  deleteTransaction: transactionService.deleteTransaction,
  deleteTransactions: transactionService.deleteTransactions,
};
