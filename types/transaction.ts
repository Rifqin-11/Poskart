export type Transaction = {
  id: string;
  booth: string;
  location: string;
  customer: string;
  packageName: string;
  amount: number;
  status: "paid" | "pending" | "failed" | "refunded";
  provider: "QRIS" | "Cash";
  createdAt: string;
};
