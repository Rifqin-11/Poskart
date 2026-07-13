import { transactionService } from "@/server/admin/transaction-service";

export const transactionsApi = {
  getTransactions: transactionService.getTransactions,
  getTransactionsPage: transactionService.getTransactionsPage,
  getFailedPrintsByBooth: transactionService.getFailedPrintsByBooth,
  retryPrint: transactionService.retryPrint,
  markTransactionAsTesting: transactionService.markTransactionAsTesting,
  unmarkTransactionAsTesting: transactionService.unmarkTransactionAsTesting,
  requestTransactionAction: transactionService.requestTransactionAction,
  getTransactionActionRequestsForSuperadmin:
    transactionService.getTransactionActionRequestsForSuperadmin,
  reviewTransactionActionRequest: transactionService.reviewTransactionActionRequest,
};
