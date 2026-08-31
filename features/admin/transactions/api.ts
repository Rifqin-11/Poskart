import { transactionService } from "@/server/admin/transaction-service";

export const transactionsApi = {
  getTransactions: transactionService.getTransactions,
  getTransactionsPage: transactionService.getTransactionsPage,
  getFailedPrintsByBooth: transactionService.getFailedPrintsByBooth,
  retryPrint: transactionService.retryPrint,
  markTransactionAsTesting: transactionService.markTransactionAsTesting,
  unmarkTransactionAsTesting: transactionService.unmarkTransactionAsTesting,
  createAdminQrisTransaction: transactionService.createAdminQrisTransaction,
  exportSignedTransactionReport:
    transactionService.exportSignedTransactionReport,
  exportProfitSharingStatement:
    transactionService.exportProfitSharingStatement,
  checkAdminQrisTransactionStatus:
    transactionService.checkAdminQrisTransactionStatus,
  requestTransactionAction: transactionService.requestTransactionAction,
  getTransactionActionRequestsForSuperadmin:
    transactionService.getTransactionActionRequestsForSuperadmin,
  reviewTransactionActionRequest: transactionService.reviewTransactionActionRequest,
};
