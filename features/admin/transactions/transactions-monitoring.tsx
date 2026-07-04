"use client";

import {
  type ComponentType,
  type ReactNode,
  useMemo,
  useState,
} from "react";
import { Banknote, ChevronDown, Printer, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { PageHeader } from "@/features/admin/_components/page-header";
import {
  useMarkTransactionAsTesting,
  useRequestTransactionAction,
  useTransactions,
  useUnmarkTransactionAsTesting,
} from "@/features/admin/transactions/use-transactions";
import { useAppConfig } from "@/features/admin/settings/use-settings";
import { usePermission } from "@/features/admin/hooks/use-permission";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/i18n-provider";
import type { AppConfigRow } from "@/types/app-config";
import type { Transaction, TransactionActionType } from "@/types/transaction";

function getTransactionPaymentMethod(transaction: Transaction) {
  if (transaction.provider === "Voucher") return "Voucher";
  const location = transaction.location.trim().toUpperCase();
  if (location.includes("VOUCHER")) return "Voucher";
  return transaction.provider;
}

function renderTransactionStatus(status: Transaction["status"]) {
  return (
    <Badge
      variant={
        status === "paid"
          ? "success"
          : status === "pending"
            ? "warning"
            : "destructive"
      }
    >
      {status}
    </Badge>
  );
}

function renderPaymentMethod(
  method: ReturnType<typeof getTransactionPaymentMethod>,
) {
  return (
    <Badge variant={method === "Voucher" ? "secondary" : "outline"}>
      {method}
    </Badge>
  );
}

function getTransactionActionLabel(action: TransactionActionType) {
  if (action === "verify") return "Verify";
  if (action === "refund") return "Refund";
  return "Archive";
}

function getTransactionActionItems(
  transaction: Transaction,
  onRequest: (transaction: Transaction, action: TransactionActionType) => void,
  onMarkTesting: (transaction: Transaction) => void,
  onUnmarkTesting: (transaction: Transaction) => void,
) {
  const items: { label: string; onClick: () => void; destructive?: boolean }[] =
    [];

  if (transaction.status !== "paid" && transaction.status !== "refunded") {
    items.push({
      label: "Verify",
      onClick: () => onRequest(transaction, "verify"),
    });
  }

  if (transaction.status === "paid") {
    items.push({
      label: "Refund",
      destructive: true,
      onClick: () => onRequest(transaction, "refund"),
    });
  }

  if (transaction.isTesting) {
    items.push({
      label: "Unmark test mode",
      onClick: () => onUnmarkTesting(transaction),
    });
  } else {
    items.push({
      label: "Mark as test mode",
      onClick: () => onMarkTesting(transaction),
    });
  }

  items.push({
    label: "Archive",
    destructive: true,
    onClick: () => onRequest(transaction, "archive"),
  });

  return items;
}

function getTransactionDateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function renderTestingBadge(transaction: Transaction) {
  if (!transaction.isTesting) return null;
  return <Badge variant="warning">Test mode</Badge>;
}

function renderTransactionStatusBadges(transaction: Transaction) {
  if (transaction.isArchived) return <Badge variant="secondary">Archived</Badge>;
  return transaction.isTesting
    ? renderTestingBadge(transaction)
    : renderTransactionStatus(transaction.status);
}

function isArchiveableTransaction(transaction: Transaction) {
  return !transaction.isArchived && !transaction.pendingAction;
}

type BulkAction = TransactionActionType | "mark-testing" | "unmark-testing";

function getBulkActionLabel(action: BulkAction) {
  if (action === "verify") return "Verify";
  if (action === "refund") return "Refund";
  if (action === "mark-testing") return "Mark as test mode";
  if (action === "unmark-testing") return "Unmark test mode";
  return "Archive";
}

function canApplyBulkAction(transaction: Transaction, action: BulkAction) {
  if (transaction.isArchived || transaction.pendingAction) return false;

  if (action === "verify") {
    return transaction.status !== "paid" && transaction.status !== "refunded";
  }
  if (action === "refund") {
    return transaction.status === "paid";
  }
  if (action === "mark-testing") {
    return !transaction.isTesting;
  }
  if (action === "unmark-testing") {
    return Boolean(transaction.isTesting);
  }
  return true;
}

function SelectionCheckbox({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      className="size-4 rounded border-zinc-300 text-zinc-950 accent-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
    />
  );
}

function BulkActionMenu({
  disabled,
  selectedCount,
  items,
}: {
  disabled?: boolean;
  selectedCount: number;
  items: {
    action: BulkAction;
    count: number;
    destructive?: boolean;
    onClick: () => void;
  }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || selectedCount === 0}
        onClick={() => setOpen((value) => !value)}
      >
        Action selected
        {selectedCount > 0 ? ` (${selectedCount})` : ""}
        <ChevronDown className="size-4" />
      </Button>
      {open ? (
        <div className="absolute right-0 top-10 z-40 w-56 rounded-lg border border-zinc-200 bg-white p-1 shadow-xl">
          {items.map((item) => (
            <button
              key={item.action}
              type="button"
              disabled={item.count === 0}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40",
                item.destructive && "text-red-600",
              )}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
            >
              <span>{getBulkActionLabel(item.action)}</span>
              <span className="text-xs text-zinc-400">{item.count}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function calculateConfiguredFee(
  amount: number,
  feeType?: AppConfigRow["gateway_fee_type"],
  percentage?: number,
  fixedAmount?: number,
) {
  if (feeType === "fixed") {
    return Math.max(0, Math.round(Number(fixedAmount ?? 0)));
  }
  return Math.max(0, Math.round((amount * Number(percentage ?? 0)) / 100));
}

function getTransactionGatewayFee(
  transaction: Transaction,
  config?: AppConfigRow | null,
) {
  const paymentMethod = getTransactionPaymentMethod(transaction);
  if (paymentMethod !== "QRIS" || transaction.status !== "paid") return 0;

  return calculateConfiguredFee(
    transaction.amount,
    config?.gateway_fee_type,
    config?.gateway_fee_percentage,
    config?.gateway_fee_fixed_amount,
  );
}

function getTransactionNetAmount(
  transaction: Transaction,
  config?: AppConfigRow | null,
) {
  return Math.max(
    0,
    transaction.amount - getTransactionGatewayFee(transaction, config),
  );
}

function formatPercentage(value?: number) {
  return `${Number(value ?? 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })}%`;
}

function getConfiguredFeeRuleLabel(config?: AppConfigRow | null) {
  if (config?.gateway_fee_type === "fixed") {
    return formatCurrency(Number(config.gateway_fee_fixed_amount ?? 0));
  }
  return formatPercentage(config?.gateway_fee_percentage);
}

function getTransactionFeeRuleLabel(
  transaction: Transaction,
  config?: AppConfigRow | null,
) {
  const fee = getTransactionGatewayFee(transaction, config);
  if (fee <= 0) return "Rp 0";
  if (config?.gateway_fee_type === "fixed") return formatCurrency(fee);
  return formatPercentage(config?.gateway_fee_percentage);
}

function AmountBreakdown({
  gross,
  feeLabel,
  className = "",
}: {
  gross: number;
  feeLabel: string;
  className?: string;
}) {
  return (
    <div className={`mt-1 space-y-0.5 text-xs text-zinc-500 ${className}`}>
      <div>Gross {formatCurrency(gross)}</div>
      <div>fee {feeLabel}</div>
    </div>
  );
}

function TransactionSummaryMetric({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  description: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 border-zinc-100 md:border-r md:pr-5 md:last:border-r-0">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <div className="text-sm text-zinc-500">{label}</div>
        <div className="mt-1 truncate text-2xl font-semibold text-zinc-950">
          {value}
        </div>
        <div className="mt-1 text-xs text-zinc-500">{description}</div>
      </div>
    </div>
  );
}

export function TransactionsMonitoring() {
  const { t } = useI18n();
  const { data: config } = useAppConfig();
  const requestAction = useRequestTransactionAction();
  const markTesting = useMarkTransactionAsTesting();
  const unmarkTesting = useUnmarkTransactionAsTesting();
  const { isReadOnly } = usePermission();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const includeSpecialStatusTransactions =
    statusFilter === "archive" || statusFilter === "testing";
  const { data = [] } = useTransactions(includeSpecialStatusTransactions);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [packageFilter, setPackageFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const paymentMethodOptions = useMemo(
    () =>
      Array.from(new Set(data.map(getTransactionPaymentMethod))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [data],
  );
  const packageOptions = useMemo(
    () =>
      Array.from(new Set(data.map((transaction) => transaction.packageName)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [data],
  );

  const filtered = data.filter((t: Transaction) => {
    const paymentMethod = getTransactionPaymentMethod(t);
    const matchSearch =
      !search ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.device.toLowerCase().includes(search.toLowerCase()) ||
      t.customer.toLowerCase().includes(search.toLowerCase()) ||
      t.packageName.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "all"
        ? !t.isArchived && !t.isTesting
        : statusFilter === "archive"
          ? Boolean(t.isArchived)
          : statusFilter === "testing"
            ? Boolean(t.isTesting)
            : !t.isArchived && !t.isTesting && t.status === statusFilter;
    const matchPaymentMethod =
      paymentMethodFilter === "all" || paymentMethod === paymentMethodFilter;
    const matchPackage =
      packageFilter === "all" || t.packageName === packageFilter;
    const matchDate =
      !dateFilter || getTransactionDateKey(t.createdAtRaw) === dateFilter;
    return (
      matchSearch &&
      matchStatus &&
      matchPaymentMethod &&
      matchPackage &&
      matchDate
    );
  });
  const summary = filtered.reduce(
    (acc, transaction) => {
      const isActivePaid =
        transaction.status === "paid" &&
        !transaction.isTesting &&
        !transaction.isArchived;
      const netAmount = getTransactionNetAmount(transaction, config);
      return {
        revenue: acc.revenue + (isActivePaid ? netAmount : 0),
        printCount: acc.printCount + (isActivePaid ? transaction.printCount : 0),
        transactionCount: acc.transactionCount + 1,
        paidCount: acc.paidCount + (isActivePaid ? 1 : 0),
        grossRevenue: acc.grossRevenue + (isActivePaid ? transaction.amount : 0),
      };
    },
    {
      revenue: 0,
      printCount: 0,
      transactionCount: 0,
      paidCount: 0,
      grossRevenue: 0,
    },
  );
  const hasActiveFilters =
    search.trim() ||
    statusFilter !== "all" ||
    paymentMethodFilter !== "all" ||
    packageFilter !== "all" ||
    dateFilter;
  const activePage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / pageSize)),
  );
  const paginatedTransactions = filtered.slice(
    (activePage - 1) * pageSize,
    activePage * pageSize,
  );
  const selectablePageTransactions = paginatedTransactions.filter(
    isArchiveableTransaction,
  );
  const selectedTransactions = data.filter(
    (transaction) =>
      selectedIds.has(transaction.id) && isArchiveableTransaction(transaction),
  );
  const allPageSelected =
    selectablePageTransactions.length > 0 &&
    selectablePageTransactions.every((transaction) =>
      selectedIds.has(transaction.id),
    );
  const selectedCount = selectedTransactions.length;
  const bulkActions: BulkAction[] = [
    "verify",
    "refund",
    "mark-testing",
    "unmark-testing",
    "archive",
  ];
  const bulkActionItems = bulkActions.map((action) => ({
    action,
    count: selectedTransactions.filter((transaction) =>
      canApplyBulkAction(transaction, action),
    ).length,
    destructive: action === "refund" || action === "archive",
    onClick: () => void handleBulkAction(action),
  }));

  function setTransactionSelected(transactionId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(transactionId);
      } else {
        next.delete(transactionId);
      }
      return next;
    });
  }

  function setPageSelected(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const transaction of selectablePageTransactions) {
        if (checked) {
          next.add(transaction.id);
        } else {
          next.delete(transaction.id);
        }
      }
      return next;
    });
  }

  async function handleRequestAction(
    transaction: Transaction,
    action: TransactionActionType,
  ) {
    try {
      await requestAction.mutateAsync({
        transactionId: transaction.id,
        action,
      });
      toast.success(
        `${getTransactionActionLabel(action)} is waiting for Super Admin approval.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create request",
      );
    }
  }

  async function handleMarkTesting(transaction: Transaction) {
    try {
      await markTesting.mutateAsync(transaction.id);
      toast.success("Transaction marked as test mode.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to mark transaction as test mode",
      );
    }
  }

  async function handleUnmarkTesting(transaction: Transaction) {
    try {
      await unmarkTesting.mutateAsync(transaction.id);
      toast.success("Transaction test mode was removed.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to remove transaction test mode",
      );
    }
  }

  async function handleBulkAction(action: BulkAction) {
    const eligibleTransactions = selectedTransactions.filter((transaction) =>
      canApplyBulkAction(transaction, action),
    );
    if (eligibleTransactions.length === 0) {
      toast.error(`No valid transactions for ${getBulkActionLabel(action)}.`);
      return;
    }

    let successCount = 0;
    let failedCount = 0;
    let failedMessage = "";
    for (const transaction of eligibleTransactions) {
      try {
        if (action === "mark-testing") {
          await markTesting.mutateAsync(transaction.id);
        } else if (action === "unmark-testing") {
          await unmarkTesting.mutateAsync(transaction.id);
        } else {
          await requestAction.mutateAsync({
            transactionId: transaction.id,
            action,
          });
        }
        successCount += 1;
      } catch (error) {
        failedCount += 1;
        failedMessage =
          error instanceof Error
            ? error.message
            : `Failed to run ${getBulkActionLabel(action)}`;
      }
    }

    if (successCount > 0) {
      setSelectedIds((current) => {
        const next = new Set(current);
        for (const transaction of eligibleTransactions) {
          next.delete(transaction.id);
        }
        return next;
      });
      const approvalSuffix =
        action === "verify" || action === "refund" || action === "archive"
          ? " and waiting for Super Admin approval"
          : "";
      toast.success(
        `${successCount} transactions processed${approvalSuffix}.`,
      );
    }
    if (failedMessage) {
      toast.error(
        failedCount > 1
          ? `${failedCount} transactions failed. ${failedMessage}`
          : failedMessage,
      );
    }
  }

  return (
    <div>
      <PageHeader
        title="Transaction & QRIS Monitoring"
        description="Track live payments, failed logs, manual verification, retry, and refund tools."
      />

      <Card className="mb-4">
        <CardContent className="grid gap-4 p-5 md:grid-cols-3">
          <TransactionSummaryMetric
            icon={Banknote}
            label="Total revenue"
            value={formatCurrency(summary.revenue)}
            description={
              <div className="space-y-0.5">
                <div>Gross {formatCurrency(summary.grossRevenue)}</div>
                <div>QRIS fee {getConfiguredFeeRuleLabel(config)}</div>
              </div>
            }
          />
          <TransactionSummaryMetric
            icon={Printer}
            label="Total prints"
            value={`${summary.printCount} print`}
            description="From paid transactions"
          />
          <TransactionSummaryMetric
            icon={ReceiptText}
            label="Total transactions"
            value={`${summary.transactionCount} transactions`}
            description={
              hasActiveFilters
                ? `Filtered from ${data.length} transactions`
                : "All transactions"
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="grid w-full gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.2fr)_150px_170px_190px_160px_auto]">
              <Input
                placeholder="Search by ID, device, customer…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedIds(new Set());
                  setPage(1);
                }}
              />
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setSelectedIds(new Set());
                  setPage(1);
                }}
              >
                <option value="all">All status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
                <option value="archive">{t("transactions.status.archive")}</option>
                <option value="testing">{t("transactions.status.testing")}</option>
              </Select>
              <Select
                value={paymentMethodFilter}
                onChange={(e) => {
                  setPaymentMethodFilter(e.target.value);
                  setSelectedIds(new Set());
                  setPage(1);
                }}
              >
                <option value="all">All methods</option>
                {paymentMethodOptions.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </Select>
              <Select
                value={packageFilter}
                onChange={(e) => {
                  setPackageFilter(e.target.value);
                  setSelectedIds(new Set());
                  setPage(1);
                }}
              >
                <option value="all">All packages</option>
                {packageOptions.map((packageName) => (
                  <option key={packageName} value={packageName}>
                    {packageName}
                  </option>
                ))}
              </Select>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setSelectedIds(new Set());
                  setPage(1);
                }}
                aria-label="Filter transaction date"
              />
              <Button
                variant="outline"
                disabled={!hasActiveFilters}
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setPaymentMethodFilter("all");
                  setPackageFilter("all");
                  setDateFilter("");
                  setSelectedIds(new Set());
                  setPage(1);
                }}
              >
                Reset
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span className="whitespace-nowrap">
                {filtered.length} of {data.length} transactions
              </span>
              {!isReadOnly("transactions") ? (
                <BulkActionMenu
                  selectedCount={selectedCount}
                  disabled={
                    requestAction.isPending ||
                    markTesting.isPending ||
                    unmarkTesting.isPending
                  }
                  items={bulkActionItems}
                />
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="hidden overflow-x-auto xl:block">
            <Table className="min-w-180">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <SelectionCheckbox
                      label="Select all transactions on this page"
                      checked={allPageSelected}
                      disabled={selectablePageTransactions.length === 0}
                      onChange={setPageSelected}
                    />
                  </TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Amount net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((transaction: Transaction) => {
                  const paymentMethod =
                    getTransactionPaymentMethod(transaction);
                  const netAmount = getTransactionNetAmount(transaction, config);
                  const hasGatewayFeeBreakdown =
                    paymentMethod === "QRIS" && transaction.status === "paid";
                  const feeRuleLabel = getTransactionFeeRuleLabel(
                    transaction,
                    config,
                  );

                  return (
                    <TableRow
                      key={transaction.id}
                      className={cn(
                        transaction.isArchived && "bg-zinc-50 text-zinc-500",
                      )}
                    >
                      <TableCell>
                        <SelectionCheckbox
                          label={`Select transaction ${transaction.id}`}
                          checked={selectedIds.has(transaction.id)}
                          disabled={!isArchiveableTransaction(transaction)}
                          onChange={(checked) =>
                            setTransactionSelected(transaction.id, checked)
                          }
                        />
                      </TableCell>
                      <TableCell className="max-w-[120px] font-mono text-xs break-words">
                        {transaction.id}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-zinc-600">
                        {formatDateTime(transaction.createdAtRaw)}
                      </TableCell>
                      <TableCell className="max-w-[220px] break-words">
                        {transaction.device}
                      </TableCell>
                      <TableCell>
                        {renderPaymentMethod(paymentMethod)}
                      </TableCell>
                      <TableCell className="max-w-[160px] break-words">
                        {transaction.packageName}
                      </TableCell>
                      <TableCell className="min-w-[140px]">
                        <div className="whitespace-nowrap font-medium text-zinc-950">
                          {formatCurrency(netAmount)}
                        </div>
                        {hasGatewayFeeBreakdown ? (
                          <AmountBreakdown
                            gross={transaction.amount}
                            feeLabel={feeRuleLabel}
                          />
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {renderTransactionStatusBadges(transaction)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {transaction.pendingAction ? (
                          <Badge variant="warning">
                            {getTransactionActionLabel(
                              transaction.pendingAction.action,
                            )}
                          </Badge>
                        ) : !transaction.isArchived &&
                          !isReadOnly("transactions") ? (
                          <div className="flex items-center gap-1">
                            <DropdownMenu
                              items={getTransactionActionItems(
                                transaction,
                                (selectedTransaction, action) =>
                                  void handleRequestAction(
                                    selectedTransaction,
                                    action,
                                  ),
                                (selectedTransaction) =>
                                  void handleMarkTesting(selectedTransaction),
                                (selectedTransaction) =>
                                  void handleUnmarkTesting(selectedTransaction),
                              )}
                            />
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-10 text-center text-sm text-zinc-400"
                    >
                      No transactions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-3 xl:hidden">
            {paginatedTransactions.map((transaction: Transaction) => {
              const paymentMethod = getTransactionPaymentMethod(transaction);
              const netAmount = getTransactionNetAmount(transaction, config);
              const hasGatewayFeeBreakdown =
                paymentMethod === "QRIS" && transaction.status === "paid";
              const feeRuleLabel = getTransactionFeeRuleLabel(
                transaction,
                config,
              );

              return (
                <div
                  key={transaction.id}
                  className={cn(
                    "rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm",
                    transaction.isArchived && "bg-zinc-50 text-zinc-500",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <SelectionCheckbox
                          label={`Select transaction ${transaction.id}`}
                          checked={selectedIds.has(transaction.id)}
                          disabled={!isArchiveableTransaction(transaction)}
                          onChange={(checked) =>
                            setTransactionSelected(transaction.id, checked)
                          }
                        />
                        {renderPaymentMethod(paymentMethod)}
                        {renderTransactionStatusBadges(transaction)}
                      </div>
                      <p className="mt-2 text-lg font-semibold text-zinc-950">
                        {formatCurrency(netAmount)}
                      </p>
                      {hasGatewayFeeBreakdown ? (
                        <AmountBreakdown
                          gross={transaction.amount}
                          feeLabel={feeRuleLabel}
                        />
                      ) : null}
                      <p className="mt-1 break-all font-mono text-xs text-zinc-500">
                        {transaction.id}
                      </p>
                    </div>
                    {transaction.pendingAction ? (
                      <Badge variant="warning">
                        {getTransactionActionLabel(
                          transaction.pendingAction.action,
                        )}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs text-zinc-500">Date</p>
                      <p className="mt-1 text-zinc-700">
                        {formatDateTime(transaction.createdAtRaw)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Device</p>
                      <p className="mt-1 break-words text-zinc-900">
                        {transaction.device}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Package</p>
                      <p className="mt-1 break-words text-zinc-900">
                        {transaction.packageName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Customer</p>
                      <p className="mt-1 break-words text-zinc-900">
                        {transaction.customer}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Payment</p>
                      <p className="mt-1 text-zinc-900">{paymentMethod}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 pt-3">
                    {transaction.pendingAction ? (
                      <span className="text-xs text-zinc-500">
                        Waiting for Super Admin approval
                      </span>
                    ) : !transaction.isArchived &&
                      !isReadOnly("transactions") ? (
                      <DropdownMenu
                        items={getTransactionActionItems(
                          transaction,
                          (selectedTransaction, action) =>
                            void handleRequestAction(
                              selectedTransaction,
                              action,
                            ),
                          (selectedTransaction) =>
                            void handleMarkTesting(selectedTransaction),
                          (selectedTransaction) =>
                            void handleUnmarkTesting(selectedTransaction),
                        )}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-10 text-center text-sm text-zinc-400">
                No transactions found.
              </div>
            )}
          </div>
          <TablePagination
            page={activePage}
            pageSize={pageSize}
            totalItems={filtered.length}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
