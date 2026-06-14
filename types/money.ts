export type MoneyEntryType = "income" | "expense";
export type MoneyWalletType = "cash" | "qris";

export type MoneyCategory =
  | "opening_balance"
  | "sales_income"
  | "other_income"
  | "operational_expense"
  | "purchase"
  | "withdrawal"
  | "correction"
  | "other_expense";

export type MoneyEntry = {
  id: string;
  walletType: MoneyWalletType;
  entryType: MoneyEntryType;
  category: MoneyCategory;
  amount: number;
  feePercentage: number;
  title: string;
  notes: string | null;
  occurredAt: string;
  createdAt: string;
};

export type MoneyEntryInput = {
  id?: string;
  walletType: MoneyWalletType;
  entryType: MoneyEntryType;
  category: MoneyCategory;
  amount: number;
  feePercentage: number;
  title: string;
  notes: string;
  occurredAt: string;
};

export type MoneyActionState = {
  success: boolean;
  error?: string;
};
