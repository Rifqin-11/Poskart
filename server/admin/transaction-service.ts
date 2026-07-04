import {
  getTransactions,
  getFailedPrintsByBooth,
  retryPrint,
  requestTransactionAction,
  markTransactionAsTesting,
  unmarkTransactionAsTesting,
  getTransactionActionRequestsForSuperadmin,
  reviewTransactionActionRequest,
} from "@/server/admin/actions/transaction-actions";
import type { TransactionActionType } from "@/types/transaction";

export const transactionService = {
  getTransactions: (input?: { includeArchived?: boolean }) =>
    getTransactions(input),
  getFailedPrintsByBooth,
  retryPrint,
  markTransactionAsTesting,
  unmarkTransactionAsTesting,
  requestTransactionAction: (input: {
    transactionId: string;
    action: TransactionActionType;
    reason?: string;
  }) => requestTransactionAction(input),
  getTransactionActionRequestsForSuperadmin,
  reviewTransactionActionRequest,
};
