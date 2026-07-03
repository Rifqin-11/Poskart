export type PrintStatus = "pending" | "printed" | "failed" | "reprinting";
export type TransactionProvider = "QRIS" | "Cash" | "Voucher";

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
};
