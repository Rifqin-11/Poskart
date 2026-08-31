"use client";

import type { ComponentProps } from "react";
import { useState } from "react";
import {
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  CalendarDays,
  Clock3,
  Plus,
  Tag,
  Tags,
  Trash2,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover } from "@/components/ui/popover";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  categories,
  evaluateMoneyExpression,
  formatMoneyExpression,
  toLocalDateTime,
} from "@/features/finance/finance-dashboard.utils";
import { formatCurrency } from "@/lib/utils";
import type {
  MoneyCategory,
  MoneyCustomCategory,
  MoneyEntry,
  MoneyEntryInput,
  MoneyEntryMode,
  MoneyEntryType,
  MoneyTag,
  MoneyTransferInput,
  MoneyWallet,
  MoneyWalletType,
} from "@/types/finance";

export function FinanceEntryDialog({
  entry,
  customCategories,
  tags,
  wallets,
  walletBalances,
  pending,
  onClose,
  onAddTag,
  onSubmit,
  onTransferSubmit,
}: {
  entry: MoneyEntry | null;
  customCategories: MoneyCustomCategory[];
  tags: MoneyTag[];
  wallets: MoneyWallet[];
  walletBalances: Map<string, number>;
  pending: boolean;
  onClose: () => void;
  onAddTag: () => void;
  onSubmit: (values: MoneyEntryInput) => void;
  onTransferSubmit: (values: MoneyTransferInput) => void;
}) {
  const [entryType, setEntryType] = useState<MoneyEntryMode>(
    entry?.entryType ?? "income",
  );
  const [walletType, setWalletType] = useState<MoneyWalletType>(
    entry?.walletType ?? "cash",
  );
  const [fromWalletType, setFromWalletType] = useState<MoneyWalletType>(
    wallets[0]?.id ?? "cash",
  );
  const [toWalletType, setToWalletType] = useState<MoneyWalletType>(
    wallets.find((wallet) => wallet.id !== (wallets[0]?.id ?? "cash"))?.id ??
      "qris",
  );
  const [category, setCategory] = useState<MoneyCategory>(
    entry?.category ?? "opening_balance",
  );
  const [amount, setAmount] = useState(entry?.amount ?? 0);
  const [feePercentageInput, setFeePercentageInput] = useState(
    entry?.feePercentage ? String(entry.feePercentage) : "",
  );
  const feePercentage =
    feePercentageInput === "" || feePercentageInput === "."
      ? 0
      : Number(feePercentageInput);
  const [title, setTitle] = useState(entry?.title ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [selectedTagIds, setSelectedTagIds] = useState(
    entry?.tags.map((tag) => tag.id) ?? [],
  );
  const [occurredAt, setOccurredAt] = useState(
    toLocalDateTime(entry?.occurredAt ?? new Date().toISOString()),
  );
  const occurredDate = getLocalDate(occurredAt);
  const occurredTime = getLocalTime(occurredAt);

  const changeType = (nextType: MoneyEntryMode) => {
    setEntryType(nextType);
    if (nextType !== "transfer") {
      setCategory(categories[nextType][0].value);
    }
  };
  const availableCategories = [
    ...(entryType === "transfer" ? [] : categories[entryType]),
    ...customCategories
      .filter((item) => item.entryType === entryType)
      .map((item) => ({ value: item.name, label: item.name })),
  ];
  const transferWalletInvalid = fromWalletType === toWalletType;

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={entry ? "Edit transaction" : "Add transaction"}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (entryType === "transfer") {
            onTransferSubmit({
              fromWalletType,
              toWalletType,
              amount,
              title,
              notes,
              tagIds: selectedTagIds,
              occurredAt,
            });
            return;
          }
          onSubmit({
            id: entry?.id,
            walletType,
            entryType,
            category,
            amount,
            feePercentage,
            title,
            notes,
            tagIds: selectedTagIds,
            occurredAt,
          });
        }}
      >
        <div className={entry ? "grid grid-cols-2 gap-2" : "grid grid-cols-3 gap-2"}>
          <Button
            type="button"
            variant={entryType === "income" ? "default" : "outline"}
            onClick={() => changeType("income")}
          >
            <ArrowUpCircle className="size-4" />
            Income
          </Button>
          <Button
            type="button"
            variant={entryType === "expense" ? "destructive" : "outline"}
            onClick={() => changeType("expense")}
          >
            <ArrowDownCircle className="size-4" />
            Expense
          </Button>
          {!entry ? (
            <Button
              type="button"
              variant={entryType === "transfer" ? "default" : "outline"}
              onClick={() => changeType("transfer")}
            >
              <ArrowLeftRight className="size-4" />
              Transfer
            </Button>
          ) : null}
        </div>
        {entryType === "transfer" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium">
                From wallet
                <Select
                  value={fromWalletType}
                  onChange={(event) => {
                    const nextWallet = event.target.value as MoneyWalletType;
                    setFromWalletType(nextWallet);
                    if (nextWallet === toWalletType) {
                      setToWalletType(
                        wallets.find((wallet) => wallet.id !== nextWallet)
                          ?.id ?? nextWallet,
                      );
                    }
                  }}
                >
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {formatWalletOption(wallet, walletBalances)}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                To wallet
                <Select
                  value={toWalletType}
                  onChange={(event) =>
                    setToWalletType(event.target.value as MoneyWalletType)
                  }
                >
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {formatWalletOption(wallet, walletBalances)}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium">
                Transfer amount
                <MoneyAmountInput
                  value={amount || null}
                  onValueChange={(value) => setAmount(value ?? 0)}
                  required
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                Transfer notes
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={120}
                  placeholder="e.g. Cash deposit to bank"
                  required
                />
              </label>
            </div>
            {transferWalletInvalid ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Select two different wallets to make a transfer.
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium">
                Category
                <Select
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as MoneyCategory)
                  }
                >
                  {availableCategories.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                Transaction amount
                <MoneyAmountInput
                  value={amount || null}
                  onValueChange={(value) => setAmount(value ?? 0)}
                  required
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium">
                Wallet
                <Select
                  value={walletType}
                  onChange={(event) =>
                    setWalletType(event.target.value as MoneyWalletType)
                  }
                >
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {formatWalletOption(wallet, walletBalances)}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                Transaction notes
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={120}
                  placeholder="e.g. Event revenue"
                  required
                />
              </label>
            </div>
          </>
        )}
        {walletType === "qris" && entryType === "income" ? (
          <label className="block space-y-1.5 text-sm font-medium">
            QRIS fee (optional)
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                value={feePercentageInput}
                onChange={(event) => {
                  const nextValue = event.target.value.replace(",", ".");
                  if (/^\d*(\.\d*)?$/.test(nextValue)) {
                    setFeePercentageInput(nextValue);
                  }
                }}
                placeholder="0"
                className="pr-10"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                %
              </span>
            </div>
            <span className="block text-xs font-normal text-zinc-500">
              Net received:{" "}
              {formatCurrency(
                amount -
                  Math.round((amount * Math.max(feePercentage, 0)) / 100),
              )}
            </span>
          </label>
        ) : null}
        <div className="space-y-1.5 text-sm font-medium">
          <span className="block">Date and time</span>
          <Popover
            className="finance-date-picker w-[min(360px,calc(100vw-2rem))] p-2"
            align="right"
            width={360}
            trigger={
              <span className="flex h-10 w-full items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-normal text-zinc-700 shadow-sm transition-colors hover:border-zinc-300">
                <span className="flex min-w-0 items-center gap-2">
                  <CalendarDays className="size-4 shrink-0 text-zinc-500" />
                  <span className="truncate">{formatLocalDateLabel(occurredDate)}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-zinc-500">
                  <Clock3 className="size-3.5" />
                  {occurredTime}
                </span>
              </span>
            }
          >
            <div className="space-y-3">
              <Calendar
                mode="single"
                numberOfMonths={1}
                className="w-full border-0 p-1"
                selected={occurredDate}
                onSelect={(date: Date | undefined) => {
                  if (!date) return;
                  setOccurredAt(`${formatDateInput(date)}T${occurredTime}`);
                }}
              />
              <label className="flex items-center justify-between gap-3 border-t border-zinc-100 px-1 pt-3 text-sm font-medium">
                <span className="flex items-center gap-2">
                  <Clock3 className="size-4 text-zinc-500" />
                  Time
                </span>
                <Input
                  type="time"
                  value={occurredTime}
                  onChange={(event) =>
                    setOccurredAt(
                      `${formatDateInput(occurredDate)}T${event.target.value}`,
                    )
                  }
                  className="h-9 w-[130px] rounded-xl"
                  required
                />
              </label>
            </div>
          </Popover>
        </div>
        <label className="block space-y-1.5 text-sm font-medium">
          Additional notes
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={500}
            placeholder="Optional information about this transaction"
          />
        </label>
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Transaction tags</span>
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-zinc-500 sm:inline">Maximum 10 tags</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-full px-3"
                  onClick={onAddTag}
                >
                  <Plus className="size-3.5" />
                  Add tag
                </Button>
              </div>
          </div>
          {tags.length ? (
            <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-xl border border-zinc-200 p-3">
              {tags.map((tag) => {
                const selected = selectedTagIds.includes(tag.id);
                return (
                  <Button
                    key={tag.id}
                    type="button"
                    size="sm"
                    variant={selected ? "default" : "outline"}
                    onClick={() =>
                      setSelectedTagIds((current) =>
                        selected
                          ? current.filter((id) => id !== tag.id)
                          : current.length < 10
                            ? [...current, tag.id]
                            : current,
                      )
                    }
                  >
                    <Tag className="size-3.5" />
                    {tag.name}
                  </Button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
              No tags yet. Add them using the Tag button on the main page.
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              pending ||
              amount <= 0 ||
              (entryType === "transfer" && transferWalletInvalid)
            }
          >
            {pending
              ? "Saving..."
              : entryType === "transfer"
                ? "Save transfer"
                : "Save transaction"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

type MoneyAmountInputProps = Omit<
  ComponentProps<typeof Input>,
  "type" | "value" | "onChange"
> & {
  value?: number | null;
  onValueChange: (value: number | null) => void;
};

function MoneyAmountInput({
  className,
  value,
  onValueChange,
  ...props
}: MoneyAmountInputProps) {
  const [expression, setExpression] = useState(
    value && value > 0 ? value.toLocaleString("id-ID") : "",
  );
  const calculatedAmount = evaluateMoneyExpression(expression);
  const hasInput = expression.trim().length > 0;
  const isInvalid =
    hasInput && (calculatedAmount === null || calculatedAmount <= 0);
  const hasOperator = /[+\-*/()]/.test(expression);

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
          Rp
        </span>
        <Input
          {...props}
          type="text"
          inputMode="text"
          className={`pl-10 ${className ?? ""}`}
          value={expression}
          onChange={(event) => {
            const inputElement = event.currentTarget;
            const rawExpression = inputElement.value;
            const rawCaretPosition = inputElement.selectionStart ?? rawExpression.length;
            const nextExpression = formatMoneyExpression(rawExpression);
            const nextCaretPosition = formatMoneyExpression(
              rawExpression.slice(0, rawCaretPosition),
            ).length;
            setExpression(nextExpression);
            const nextAmount = evaluateMoneyExpression(nextExpression);
            onValueChange(
              nextAmount !== null && nextAmount > 0 ? nextAmount : 0,
            );
            requestAnimationFrame(() => {
              if (document.activeElement !== inputElement) return;
              inputElement.setSelectionRange(
                nextCaretPosition,
                nextCaretPosition,
              );
            });
          }}
          aria-invalid={isInvalid}
          placeholder="0 atau 10.000 + 5.000"
        />
      </div>
      <p
        className={`text-xs font-normal ${isInvalid ? "text-red-600" : "text-zinc-500"}`}
      >
        {isInvalid
          ? "Masukkan angka dan operator +, -, ×, atau ÷ yang valid."
          : hasOperator && calculatedAmount !== null
            ? `Hasil: ${formatCurrency(calculatedAmount)}`
            : "Bisa hitung dengan +, -, ×, ÷, dan tanda kurung."}
      </p>
    </div>
  );
}

function formatWalletOption(
  wallet: MoneyWallet,
  walletBalances: Map<string, number>,
) {
  return `${wallet.name} — Sisa saldo ${formatCurrency(walletBalances.get(wallet.id) ?? 0)}`;
}

function getLocalDate(value: string) {
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function getLocalTime(value: string) {
  return value.split("T")[1]?.slice(0, 5) || "00:00";
}

function formatDateInput(value: Date) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatLocalDateLabel(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(value);
}

export function WalletManagerDialog({
  wallets,
  pending,
  onClose,
  onCreate,
  onDelete,
}: {
  wallets: MoneyWallet[];
  pending: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  onDelete: (wallet: MoneyWallet) => void;
}) {
  const [name, setName] = useState("");
  const customWallets = wallets.filter((wallet) => !wallet.isDefault);

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Manage wallets"
      overlayClassName="z-[80]"
    >
      <div className="space-y-5">
        <p className="text-sm text-zinc-500">
          Add operational wallets beyond Cash and QRIS, such as Bank BCA,
          E-Wallet, or Event Cash.
        </p>
        <form
          className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            onCreate(name);
            setName("");
          }}
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={2}
            maxLength={40}
            placeholder="e.g. Bank BCA, Event Cash"
            required
          />
          <Button type="submit" disabled={pending || name.trim().length < 2}>
            <Plus className="size-4" />
            Add wallet
          </Button>
        </form>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <WalletCards className="size-4" />
            Available wallets
          </div>
          <div className="divide-y overflow-hidden rounded-xl border border-zinc-200">
            {wallets.map((wallet) => (
              <div
                key={wallet.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-medium">{wallet.name}</div>
                  <div className="text-xs text-zinc-500">
                    {wallet.isDefault ? "Default wallet" : "Custom wallet"}
                  </div>
                </div>
                {!wallet.isDefault ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    onClick={() => onDelete(wallet)}
                    aria-label={`Delete wallet ${wallet.name}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
          {!customWallets.length ? (
            <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
              No custom wallets yet.
            </div>
          ) : null}
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function TagManagerDialog({
  tags,
  pending,
  onClose,
  onCreate,
  onDelete,
}: {
  tags: MoneyTag[];
  pending: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  onDelete: (tag: MoneyTag) => void;
}) {
  const [name, setName] = useState("");

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Manage transaction tags"
    >
      <div className="space-y-5">
        <p className="text-sm text-zinc-500">
          Tags can be applied to multiple transactions at once for grouping and filtering reports.
        </p>
        <form
          className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            onCreate(name);
            setName("");
          }}
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={2}
            maxLength={40}
            placeholder="e.g. CFD, Branch A, June Event"
            required
          />
          <Button type="submit" disabled={pending || name.trim().length < 2}>
            <Plus className="size-4" />
            Add tag
          </Button>
        </form>
        {tags.length ? (
          <div className="max-h-72 divide-y overflow-y-auto rounded-xl border border-zinc-200">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Tag className="size-4 text-zinc-400" />
                  {tag.name}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-zinc-400 hover:bg-red-50 hover:text-red-600"
                  onClick={() => onDelete(tag)}
                  aria-label={`Delete tag ${tag.name}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500">
            No custom tags yet.
          </div>
        )}
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function CategoryManagerDialog({
  categories: customCategories,
  pending,
  onClose,
  onCreate,
  onDelete,
}: {
  categories: MoneyCustomCategory[];
  pending: boolean;
  onClose: () => void;
  onCreate: (entryType: MoneyEntryType, name: string) => void;
  onDelete: (category: MoneyCustomCategory) => void;
}) {
  const [entryType, setEntryType] = useState<MoneyEntryType>("income");
  const [name, setName] = useState("");

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Manage transaction categories"
    >
      <div className="space-y-5">
        <p className="text-sm text-zinc-500">
          Create custom categories for your organization&apos;s operational needs.
          Default categories remain available to maintain report consistency.
        </p>
        <form
          className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-[150px_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            onCreate(entryType, name);
            setName("");
          }}
        >
          <Select
            value={entryType}
            onChange={(event) =>
              setEntryType(event.target.value as MoneyEntryType)
            }
            aria-label="Category type"
          >
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </Select>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={2}
            maxLength={60}
            placeholder="e.g. Equipment rental"
            required
          />
          <Button type="submit" disabled={pending || name.trim().length < 2}>
            <Plus className="size-4" />
            Add
          </Button>
        </form>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Tags className="size-4" />
            Custom categories
          </div>
          {customCategories.length ? (
            <div className="max-h-72 divide-y overflow-y-auto rounded-xl border border-zinc-200">
              {customCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-medium">{category.name}</div>
                    <div className="text-xs text-zinc-500">
                      {category.entryType === "income"
                        ? "Income"
                        : "Expense"}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    onClick={() => onDelete(category)}
                    aria-label={`Delete category ${category.name}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500">
              No custom categories yet.
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
