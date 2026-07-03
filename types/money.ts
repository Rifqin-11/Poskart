export type MoneyEntryType = "income" | "expense";
export type MoneyWalletType = string;

export type MoneyCategory = string;

export type MoneyCustomCategory = {
  id: string;
  entryType: MoneyEntryType;
  name: string;
};

export type MoneyCategoryInput = {
  entryType: MoneyEntryType;
  name: string;
};

export type MoneyTag = {
  id: string;
  name: string;
};

export type MoneyTagInput = {
  name: string;
};

export type MoneyWallet = {
  id: MoneyWalletType;
  name: string;
  type: "cash" | "qris" | "custom";
  isDefault: boolean;
};

export type MoneyWalletInput = {
  name: string;
};

export type MoneyEntry = {
  id: string;
  walletType: MoneyWalletType;
  entryType: MoneyEntryType;
  category: MoneyCategory;
  amount: number;
  feePercentage: number;
  title: string;
  notes: string | null;
  tags: MoneyTag[];
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
  tagIds: string[];
  occurredAt: string;
};

export type MoneyActionState = {
  success: boolean;
  error?: string;
};
