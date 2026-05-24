export type PrintStatus = "pending" | "printed" | "failed" | "reprinting";

export type Transaction = {
  id: string;
  device: string;
  location: string;
  customer: string;
  packageName: string;
  amount: number;
  status: "paid" | "pending" | "failed" | "refunded";
  provider: "QRIS" | "Cash";
  createdAt: string;
  printStatus: PrintStatus;
  printAttempts: number;
  printLastError?: string | null;
};
