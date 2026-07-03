import { transactionService } from "@/server/admin/transaction-service";

export const transactionsApi = {
  getTransactions: transactionService.getTransactions,
  getFailedPrintsByBooth: transactionService.getFailedPrintsByBooth,
  retryPrint: transactionService.retryPrint,
  requestTransactionAction: transactionService.requestTransactionAction,
  getTransactionActionRequestsForSuperadmin:
    transactionService.getTransactionActionRequestsForSuperadmin,
  reviewTransactionActionRequest: transactionService.reviewTransactionActionRequest,
};
