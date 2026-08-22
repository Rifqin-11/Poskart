import type {
  MoneyCategory,
  MoneyEntry,
  MoneyEntryType,
  MoneyWallet,
  MoneyWalletType,
} from "@/types/money";
import { formatJakartaDateTimeLocal } from "@/lib/jakarta-time";

export type WalletFilter = "all" | MoneyWalletType;

export const defaultMoneyWallets: MoneyWallet[] = [
  { id: "cash", name: "Tunai", type: "cash", isDefault: true },
  { id: "qris", name: "QRIS", type: "qris", isDefault: true },
];

export const walletLabels: Record<string, string> = Object.fromEntries(
  defaultMoneyWallets.map((wallet) => [wallet.id, wallet.name]),
);

export const categoryLabels: Record<MoneyCategory, string> = {
  transfer: "Transfer antar dompet",
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
  return formatJakartaDateTimeLocal(value);
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

/**
 * Evaluates whole-rupiah arithmetic without using eval or the Function
 * constructor. Thousand separators (dots or commas) are accepted in numbers.
 */
export function evaluateMoneyExpression(expression: string) {
  const input = expression
    .replace(/\s+/g, "")
    .replace(/[×xX]/g, "*")
    .replace(/÷/g, "/");
  if (!input) return null;

  let position = 0;

  const parsePrimary = (): number => {
    if (input[position] === "(") {
      position += 1;
      const value = parseExpression();
      if (input[position] !== ")") throw new Error("Missing closing parenthesis");
      position += 1;
      return value;
    }

    const start = position;
    while (/[\d.,]/.test(input[position] ?? "")) position += 1;
    const literal = input.slice(start, position);
    const digits = literal.replace(/[.,]/g, "");
    if (!digits || !/^\d+$/.test(digits)) {
      throw new Error("Invalid amount");
    }

    const value = Number(digits);
    if (!Number.isSafeInteger(value)) throw new Error("Amount is too large");
    return value;
  };

  const parseUnary = (): number => {
    if (input[position] === "+") {
      position += 1;
      return parseUnary();
    }
    if (input[position] === "-") {
      position += 1;
      return -parseUnary();
    }
    return parsePrimary();
  };

  const parseTerm = (): number => {
    let value = parseUnary();
    while (input[position] === "*" || input[position] === "/") {
      const operator = input[position];
      position += 1;
      const nextValue = parseUnary();
      if (operator === "/" && nextValue === 0) {
        throw new Error("Cannot divide by zero");
      }
      value = operator === "*" ? value * nextValue : value / nextValue;
      if (!Number.isFinite(value)) throw new Error("Invalid result");
    }
    return value;
  };

  const parseExpression = (): number => {
    let value = parseTerm();
    while (input[position] === "+" || input[position] === "-") {
      const operator = input[position];
      position += 1;
      const nextValue = parseTerm();
      value = operator === "+" ? value + nextValue : value - nextValue;
      if (!Number.isFinite(value)) throw new Error("Invalid result");
    }
    return value;
  };

  try {
    const value = parseExpression();
    if (position !== input.length || !Number.isFinite(value)) return null;
    const roundedValue = Math.round(value);
    return Number.isSafeInteger(roundedValue) ? roundedValue : null;
  } catch {
    return null;
  }
}

export function formatMoneyExpression(expression: string) {
  return expression.replace(/[\d.,]+/g, (literal) => {
    const digits = literal.replace(/[.,]/g, "");
    if (!digits) return literal;
    return Number(digits).toLocaleString("id-ID");
  });
}

export function isTransferEntry(entry: Pick<MoneyEntry, "category">) {
  return entry.category === "transfer";
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
