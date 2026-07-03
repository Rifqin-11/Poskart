import type {
  MoneyCategory,
  MoneyEntry,
  MoneyEntryType,
  MoneyWallet,
  MoneyWalletType,
} from "@/types/money";

export type WalletFilter = "all" | MoneyWalletType;

export const defaultMoneyWallets: MoneyWallet[] = [
  { id: "cash", name: "Tunai", type: "cash", isDefault: true },
  { id: "qris", name: "QRIS", type: "qris", isDefault: true },
];

export const walletLabels: Record<string, string> = Object.fromEntries(
  defaultMoneyWallets.map((wallet) => [wallet.id, wallet.name]),
);

export const categoryLabels: Record<MoneyCategory, string> = {
  opening_balance: "Saldo awal",
  sales_income: "Pendapatan penjualan",
  other_income: "Pendapatan lainnya",
  operational_expense: "Biaya operasional",
  purchase: "Pembelian",
  withdrawal: "Penarikan dana",
  correction: "Penyesuaian saldo",
  other_expense: "Pengeluaran lainnya",
};

export const categories: Record<
  MoneyEntryType,
  Array<{ value: MoneyCategory; label: string }>
> = {
  income: [
    { value: "opening_balance", label: "Saldo awal" },
    { value: "sales_income", label: "Pendapatan penjualan" },
    { value: "other_income", label: "Pendapatan lainnya" },
    { value: "correction", label: "Penyesuaian saldo masuk" },
  ],
  expense: [
    { value: "operational_expense", label: "Biaya operasional" },
    { value: "purchase", label: "Pembelian" },
    { value: "withdrawal", label: "Penarikan dana" },
    { value: "correction", label: "Penyesuaian saldo keluar" },
    { value: "other_expense", label: "Pengeluaran lainnya" },
  ],
};

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function getMonthKey(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(value));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

export function formatMonthLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "long",
  }).format(new Date(`${value}-01T12:00:00+07:00`));
}

export function toLocalDateTime(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function getNetAmount(entry: MoneyEntry) {
  if (
    entry.walletType !== "qris" ||
    entry.entryType !== "income" ||
    entry.feePercentage <= 0
  ) {
    return entry.amount;
  }
  const feeAmount = Math.round((entry.amount * entry.feePercentage) / 100);
  return entry.amount - feeAmount;
}

export function getCategoryLabel(category: MoneyCategory) {
  return categoryLabels[category] ?? category;
}

export function getWalletLabel(
  walletType: MoneyWalletType,
  wallets: MoneyWallet[] = defaultMoneyWallets,
) {
  return wallets.find((wallet) => wallet.id === walletType)?.name ??
    walletLabels[walletType] ??
    walletType;
}

export function getWalletKind(
  walletType: MoneyWalletType,
  wallets: MoneyWallet[] = defaultMoneyWallets,
) {
  return wallets.find((wallet) => wallet.id === walletType)?.type ??
    (walletType === "qris" ? "qris" : walletType === "cash" ? "cash" : "custom");
}
