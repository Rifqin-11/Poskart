import {
  getTransactions,
  getFailedPrintsByBooth,
  retryPrint,
  requestTransactionAction,
  getTransactionActionRequestsForSuperadmin,
  reviewTransactionActionRequest,
} from "@/server/admin/actions/transaction-actions";
import type { TransactionActionType } from "@/types/transaction";

export const transactionService = {
  getTransactions,
  getFailedPrintsByBooth,
  retryPrint,
  requestTransactionAction: (input: {
    transactionId: string;
    action: TransactionActionType;
    reason?: string;
  }) => requestTransactionAction(input),
  getTransactionActionRequestsForSuperadmin,
  reviewTransactionActionRequest,
};
