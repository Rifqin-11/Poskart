export type PrintStatus = "pending" | "printed" | "failed" | "reprinting";
export type TransactionProvider = "QRIS" | "Cash" | "Voucher" | "Event";
export type TransactionActionType = "verify" | "refund" | "archive";
export type TransactionActionStatus =
  "requested" | "approved" | "rejected" | "canceled";

export type TransactionPendingAction = {
  id: string;
  action: TransactionActionType;
  status: TransactionActionStatus;
  requestedAt: string;
};

export type Transaction = {
  id: string;
  device: string;
  location: string;
  customer: string;
  packageName: string;
  amount: number;
  status: "paid" | "pending" | "failed" | "refunded";
  provider: TransactionProvider;
  createdAt: string;
  createdAtRaw: string;
  printCount: number;
  printStatus: PrintStatus;
  printAttempts: number;
  printLastError?: string | null;
  archivedAt?: string | null;
  archiveReason?: string | null;
  isArchived?: boolean;
  isTesting?: boolean;
  pendingAction?: TransactionPendingAction | null;
};

export type TransactionActionRequest = {
  id: string;
  transactionId: string;
  organizationId: string;
  organizationName: string | null;
  action: TransactionActionType;
  status: TransactionActionStatus;
  reason: string | null;
  requestedBy: string | null;
  requestedByEmail: string | null;
  requestedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  transaction: {
    id: string;
    booth: string;
    packageName: string;
    amount: number;
    status: Transaction["status"];
    provider: TransactionProvider;
    createdAt: string;
  } | null;
};
