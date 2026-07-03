export type PayoutStatus =
  | "pending_approval"
  | "requested"
  | "approved"
  | "paid"
  | "rejected"
  | "canceled";

export type PaymentCollectionMode = "platform" | "custom";
export type PayoutFeeType = "percentage" | "fixed";

export type PayoutAccount = {
  id: string;
  organizationId: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PayoutSettings = {
  gatewayFeeType: PayoutFeeType;
  gatewayFeePercentage: number;
  gatewayFeeFixedAmount: number;
  platformFeeType: PayoutFeeType;
  platformFeePercentage: number;
  platformFeeFixedAmount: number;
  minimumPayoutAmount: number;
};

export type SavePayoutSettingsInput = {
  gatewayFeeType: PayoutFeeType;
  gatewayFeePercentage: number;
  gatewayFeeFixedAmount: number;
  platformFeeType: PayoutFeeType;
  platformFeePercentage: number;
  platformFeeFixedAmount: number;
  minimumPayoutAmount?: number;
};

export type PayoutSummary = {
  availableGrossAmount: number;
  availableGatewayFeeAmount: number;
  availablePlatformFeeAmount: number;
  availableNetAmount: number;
  pendingNetAmount: number;
  paidNetAmount: number;
  eligibleTransactionCount: number;
  pendingInvoiceCount: number;
  settings: PayoutSettings;
  payoutAccount: PayoutAccount | null;
};

export type PayoutAvailableLedgerEntry = {
  id: string;
  transactionId: string | null;
  merchantOrderId: string;
  duitkuReference: string | null;
  booth: string | null;
  packageName: string | null;
  paidAt: string | null;
  verifiedAt: string | null;
  grossAmount: number;
  gatewayFeeAmount: number;
  platformFeeAmount: number;
  netAmount: number;
};

export type PayoutInvoiceItem = {
  id: string;
  ledgerEntryId: string | null;
  transactionId: string | null;
  paymentGateway: string | null;
  booth: string | null;
  packageName: string | null;
  transactionPaidAt: string | null;
  grossAmount: number;
  gatewayFeeAmount: number;
  platformFeeAmount: number;
  netAmount: number;
  createdAt: string;
};

export type PayoutInvoice = {
  id: string;
  invoiceNumber: string;
  organizationId: string;
  organizationName: string | null;
  status: PayoutStatus;
  grossAmount: number;
  gatewayFeeAmount: number;
  platformFeeAmount: number;
  adjustmentAmount: number;
  netAmount: number;
  requestedAmount: number;
  requestedAt: string;
  reviewedAt: string | null;
  paidAt: string | null;
  paymentReference: string | null;
  paymentProofUrl: string | null;
  paymentProofKey: string | null;
  paymentProofUploadedAt: string | null;
  notes: string | null;
  reviewNotes: string | null;
  rejectionReason: string | null;
  accountSnapshot: {
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
  };
  feeSnapshot: Record<string, unknown>;
  items: PayoutInvoiceItem[];
};

export type PayoutActionState = {
  success: boolean;
  error?: string;
};

export type SavePayoutAccountInput = {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
};

export type RequestPayoutInput = {
  amount: number;
  accountId: string;
  notes?: string;
};

export type ReviewPayoutInput = {
  reviewNotes?: string;
};

export type PayoutInvoiceFilters = {
  status?: PayoutStatus | "all";
  organizationId?: string;
  paymentGateway?: string;
  dateFrom?: string;
  dateTo?: string;
};
