import {
  getTransactions,
  getTransactionsPage,
  getFailedPrintsByBooth,
  retryPrint,
  requestTransactionAction,
  markTransactionAsTesting,
  unmarkTransactionAsTesting,
  createAdminQrisTransaction,
  checkAdminQrisTransactionStatus,
  getTransactionActionRequestsForSuperadmin,
  reviewTransactionActionRequest,
} from "@/server/admin/actions/transaction-actions";
import type { TransactionActionType } from "@/types/transaction";
import type { TransactionListFilters } from "@/server/admin/actions/transaction-actions";

export const transactionService = {
  getTransactions: (input?: { includeArchived?: boolean }) =>
    getTransactions(input),
  getTransactionsPage: (input?: TransactionListFilters) =>
    getTransactionsPage(input),
  getFailedPrintsByBooth,
  retryPrint,
  markTransactionAsTesting,
  unmarkTransactionAsTesting,
  createAdminQrisTransaction,
  checkAdminQrisTransactionStatus,
  requestTransactionAction: (input: {
    transactionId: string;
    action: TransactionActionType;
    reason?: string;
  }) => requestTransactionAction(input),
  getTransactionActionRequestsForSuperadmin,
  reviewTransactionActionRequest,
};
