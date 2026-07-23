"use client";

import { type ComponentType, type ReactNode, useEffect, useState } from "react";
import {
  Banknote,
  CalendarDays,
  ChevronDown,
  FileDown,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  Printer,
  ReceiptText,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Calendar, type DateRange } from "@/components/ui/calendar";
import { Popover } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  MobileFilterButton,
  MobileFilterDrawer,
  MobileFilterField,
  PageHeader,
} from "@/features/admin/_components";
import {
  useMarkTransactionAsTesting,
  useRequestTransactionAction,
  useTransactions,
  useUnmarkTransactionAsTesting,
} from "@/features/admin/transactions/use-transactions";
import { TRANSACTION_PAGE_SIZE } from "@/features/admin/transactions/transaction-list-defaults";
import { useAppConfig } from "@/features/admin/settings/use-settings";
import { usePermission } from "@/features/admin/hooks/use-permission";
import { useBooths } from "@/features/admin/devices/use-devices";
import { usePricing } from "@/features/admin/pricing/use-pricing";
import { transactionsApi } from "@/features/admin/transactions/api";
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

function formatDateRangeLabel(from: string, to: string) {
  if (!from && !to) return "Filter tanggal";
  if (from && to) return `${from} – ${to}`;
  return from ? `Dari ${from}` : `Sampai ${to}`;
}

function toDate(value: string) {
  return value ? new Date(`${value}T00:00:00`) : undefined;
}

function toDateValue(value: Date | undefined) {
  if (!value) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeCsv(value: string | number) {
  const escaped = String(value).replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

function renderTransactionStatus(status: Transaction["status"]) {
  return (
    <Badge
      variant={
        status === "paid"
          ? "success"
          : status === "pending"
            ? "warning"
            : status === "cancelled"
              ? "secondary"
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
    <Badge
      variant={
        method === "Voucher" || method === "Event" ? "secondary" : "outline"
      }
    >
      {method}
    </Badge>
  );
}

function getTransactionActionLabel(action: TransactionActionType) {
  if (action === "verify") return "Verify";
  if (action === "refund") return "Refund";
  return "Archive";
}

function useDebouncedValue<T>(value: T, delayMs = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);
  return debounced;
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

function renderTestingBadge(transaction: Transaction) {
  if (!transaction.isTesting) return null;
  return <Badge variant="warning">Test mode</Badge>;
}

function renderTransactionStatusBadges(transaction: Transaction) {
  if (transaction.isArchived)
    return <Badge variant="secondary">Archived</Badge>;
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
  return (
    <DropdownMenu
      width={224}
      items={items.map((item) => ({
        label: getBulkActionLabel(item.action),
        rightLabel: String(item.count),
        destructive: item.destructive,
        disabled: item.count === 0,
        onClick: item.onClick,
      }))}
      trigger={({ open, toggle }) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-expanded={open}
          disabled={disabled || selectedCount === 0}
          onClick={toggle}
        >
          Action selected
          {selectedCount > 0 ? ` (${selectedCount})` : ""}
          <ChevronDown className="size-4" />
        </Button>
      )}
    />
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
    <div className="flex min-w-0 items-start gap-3 border-zinc-100 md:border-r md:pr-5 md:last:border-r-0">
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
  const { data: booths = [] } = useBooths();
  const { data: pricingPackages = [] } = usePricing();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [packageFilter, setPackageFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [fromDateFilter, setFromDateFilter] = useState("");
  const [toDateFilter, setToDateFilter] = useState("");
  const [boothFilter, setBoothFilter] = useState("all");
  const dateRange: DateRange | undefined = {
    from: toDate(fromDateFilter),
    to: toDate(toDateFilter),
  };
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [page, setPage] = useState(1);
  const pageSize = TRANSACTION_PAGE_SIZE;
  const debouncedSearch = useDebouncedValue(search);
  const debouncedPackageFilter = useDebouncedValue(packageFilter);

  const transactionQuery = useTransactions({
    page,
    pageSize,
    search: debouncedSearch,
    status: statusFilter,
    paymentMethod: paymentMethodFilter,
    packageName: debouncedPackageFilter === "all" ? "" : debouncedPackageFilter,
    date: dateFilter,
    fromDate: fromDateFilter,
    toDate: toDateFilter,
    booth: boothFilter === "all" ? "" : boothFilter,
  });
  const data = transactionQuery.data?.items ?? [];
  const packageOptions = pricingPackages.map((item) => item.name).filter(Boolean);
  const totalItems = transactionQuery.data?.totalItems ?? 0;
  const paymentMethodOptions = ["QRIS", "Cash", "Voucher", "Event"];

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setPaymentMethodFilter("all");
    setPackageFilter("all");
    setDateFilter("");
    setFromDateFilter("");
    setToDateFilter("");
    setBoothFilter("all");
    setSelectedIds(new Set());
    setPage(1);
  }

  // Filtering and pagination happen on the server. The summary is aggregated
  // server-side across every matching row, not just the visible page.
  const filtered = data;
  const serverSummary = transactionQuery.data?.summary;
  const qrisFee = serverSummary
    ? config?.gateway_fee_type === "fixed"
      ? serverSummary.qrisPaidCount *
        Number(config.gateway_fee_fixed_amount ?? 0)
      : calculateConfiguredFee(
          serverSummary.qrisGrossRevenue,
          config?.gateway_fee_type,
          config?.gateway_fee_percentage,
          config?.gateway_fee_fixed_amount,
        )
    : 0;
  const summary = {
    revenue: Math.max(0, (serverSummary?.grossRevenue ?? 0) - qrisFee),
    printCount: serverSummary?.printCount ?? 0,
    transactionCount: serverSummary?.transactionCount ?? 0,
    paidCount: serverSummary?.paidCount ?? 0,
    grossRevenue: serverSummary?.grossRevenue ?? 0,
  };
  const hasActiveFilters =
    search.trim() ||
    statusFilter !== "all" ||
    paymentMethodFilter !== "all" ||
    packageFilter !== "all" ||
    dateFilter || fromDateFilter || toDateFilter || boothFilter !== "all";
  const hasAdvancedFilters =
    statusFilter !== "all" ||
    paymentMethodFilter !== "all" ||
    packageFilter !== "all" ||
    Boolean(dateFilter || fromDateFilter || toDateFilter || boothFilter !== "all");
  const activePage = transactionQuery.data?.page ?? page;
  const paginatedTransactions = filtered;
  const isTableLoading =
    transactionQuery.isLoading ||
    (transactionQuery.isFetching && transactionQuery.isPlaceholderData);
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
      toast.success(`${successCount} transactions processed${approvalSuffix}.`);
    }
    if (failedMessage) {
      toast.error(
        failedCount > 1
          ? `${failedCount} transactions failed. ${failedMessage}`
          : failedMessage,
      );
    }
  }

  async function getTransactionsForExport() {
    const filters = {
      page: 1,
      pageSize: 50,
      search: search.trim(),
      status: statusFilter,
      paymentMethod: paymentMethodFilter,
      packageName: packageFilter === "all" ? "" : packageFilter,
      date: "",
      fromDate: fromDateFilter,
      toDate: toDateFilter,
      booth: boothFilter === "all" ? "" : boothFilter,
    };
    const firstPage = await transactionsApi.getTransactionsPage(filters);
    if (firstPage.totalPages <= 1) return firstPage.items;
    const pages = await Promise.all(
      Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
        transactionsApi.getTransactionsPage({ ...filters, page: index + 2 }),
      ),
    );
    return [firstPage.items, ...pages.map((pageResult) => pageResult.items)].flat();
  }

  async function exportToExcel() {
    setIsExporting(true);
    try {
      const transactions = await getTransactionsForExport();
      const rows = transactions.map((transaction) => [
        transaction.id,
        formatDateTime(transaction.createdAtRaw),
        transaction.device,
        getTransactionPaymentMethod(transaction),
        transaction.packageName,
        transaction.amount,
        transaction.printCount,
        transaction.status,
      ]);
      const csv = [
        ["ID", "Date & Time", "Booth", "Payment", "Package", "Amount", "Prints", "Status"],
        ...rows,
      ]
        .map((row) => row.map(escapeCsv).join(","))
        .join("\n");
      const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `laporan_transaksi_${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Laporan transaksi (CSV) berhasil diekspor.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengekspor transaksi.");
    } finally {
      setIsExporting(false);
    }
  }

  async function exportToPdf() {
    setIsExporting(true);
    try {
      const transactions = await getTransactionsForExport();
      const printWindow = window.open("", "_blank");
      if (!printWindow) throw new Error("Izinkan pop-up untuk ekspor PDF.");
      const rows = transactions
        .map((transaction) => `<tr><td>${escapeHtml(transaction.id)}</td><td>${escapeHtml(formatDateTime(transaction.createdAtRaw))}</td><td>${escapeHtml(transaction.device)}</td><td>${escapeHtml(getTransactionPaymentMethod(transaction))}</td><td>${escapeHtml(transaction.packageName)}</td><td>${escapeHtml(formatCurrency(transaction.amount))}</td><td>${escapeHtml(transaction.status)}</td></tr>`)
        .join("");
      printWindow.document.write(`<!doctype html><html><head><title>Laporan Transaksi POSKART</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#18181b}h1{font-size:20px;margin:0 0 8px}p{color:#71717a;margin:0 0 20px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #e4e4e7;padding:7px;text-align:left}th{background:#f4f4f5}</style></head><body><h1>Laporan Transaksi POSKART</h1><p>${escapeHtml(formatDateRangeLabel(fromDateFilter, toDateFilter))} · ${transactions.length} transaksi</p><table><thead><tr><th>ID</th><th>Date & Time</th><th>Booth</th><th>Payment</th><th>Package</th><th>Amount</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><script>window.print();</script></body></html>`);
      printWindow.document.close();
      toast.success("Jendela PDF laporan transaksi dibuka.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengekspor transaksi.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="min-w-0">
      <PageHeader
        title="Transaction & QRIS Monitoring"
        description="Track live payments, failed logs, manual verification, retry, and refund tools."
      />

      <Card className="mb-4 overflow-hidden">
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
                ? `Filtered from ${totalItems} transactions`
                : "All transactions"
            }
          />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="p-4 sm:p-5">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex min-w-0 gap-2 md:hidden">
              <Input
                className="min-w-0 flex-1"
                placeholder="Search by ID, device, customer…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedIds(new Set());
                  setPage(1);
                }}
              />
              <MobileFilterButton
                active={hasAdvancedFilters}
                onClick={() => setMobileFilterOpen(true)}
              />
            </div>

            <div className="hidden min-w-0 gap-2 md:flex">
              <Input
                className="min-w-0 flex-1"
                placeholder="Search by ID, device, customer…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedIds(new Set());
                  setPage(1);
                }}
              />
              <MobileFilterButton
                active={hasAdvancedFilters}
                onClick={() => setMobileFilterOpen(true)}
              />
            </div>

            <div className="hidden">
              <Input
                className="min-w-0"
                placeholder="Search by ID, device, customer…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedIds(new Set());
                  setPage(1);
                }}
              />
              <Select
                className="min-w-0"
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
                <option value="cancelled">Cancelled</option>
                <option value="archive">
                  {t("transactions.status.archive")}
                </option>
                <option value="testing">
                  {t("transactions.status.testing")}
                </option>
              </Select>
              <Select
                className="min-w-0"
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
                className="min-w-0"
                value={packageFilter === "all" ? "" : packageFilter}
                onChange={(e) => {
                  setPackageFilter(e.target.value || "all");
                  setSelectedIds(new Set());
                  setPage(1);
                }}
              >
                <option value="">All packages</option>
                {packageOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </Select>
              <Select
                className="min-w-0"
                value={boothFilter}
                onChange={(e) => { setBoothFilter(e.target.value); setSelectedIds(new Set()); setPage(1); }}
              >
                <option value="all">All booths</option>
                {booths.map((booth) => <option key={booth.id} value={booth.name}>{booth.name}</option>)}
              </Select>
              <Popover
                trigger={<span className="flex h-10 min-w-0 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-600"><CalendarDays className="size-4 shrink-0" />{formatDateRangeLabel(fromDateFilter, toDateFilter)}</span>}
              >
                <Calendar
                  selected={dateRange}
                  mode="range"
                  onSelect={(range: DateRange | undefined) => { setFromDateFilter(toDateValue(range?.from)); setToDateFilter(toDateValue(range?.to)); setSelectedIds(new Set()); setPage(1); }}
                />
              </Popover>
              <Button
                className="w-full"
                variant="outline"
                disabled={!hasActiveFilters}
                onClick={resetFilters}
              >
                Reset
              </Button>
            </div>
            <MobileFilterDrawer
              open={mobileFilterOpen}
              onOpenChange={setMobileFilterOpen}
              title="Transaction filters"
              description="Narrow the table by status, payment, package, or date."
              onReset={resetFilters}
              resetDisabled={!hasActiveFilters}
            >
              <MobileFilterField label="Status">
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
                  <option value="cancelled">Cancelled</option>
                  <option value="archive">
                    {t("transactions.status.archive")}
                  </option>
                  <option value="testing">
                    {t("transactions.status.testing")}
                  </option>
                </Select>
              </MobileFilterField>
              <MobileFilterField label="Payment method">
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
              </MobileFilterField>
              <MobileFilterField label="Package">
                <Select
                  value={packageFilter === "all" ? "" : packageFilter}
                  onChange={(e) => { setPackageFilter(e.target.value || "all"); setSelectedIds(new Set()); setPage(1); }}
                >
                  <option value="">All packages</option>
                  {packageOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </Select>
              </MobileFilterField>
              <MobileFilterField label="Booth">
                <Select value={boothFilter} onChange={(e) => { setBoothFilter(e.target.value); setSelectedIds(new Set()); setPage(1); }}>
                  <option value="all">All booths</option>
                  {booths.map((booth) => <option key={booth.id} value={booth.name}>{booth.name}</option>)}
                </Select>
              </MobileFilterField>
              <MobileFilterField label="Date range">
                <Popover
                  trigger={
                    <span className="flex h-10 w-full items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm text-zinc-600">
                      <CalendarDays className="size-4" />
                      {formatDateRangeLabel(fromDateFilter, toDateFilter)}
                    </span>
                  }
                >
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range: DateRange | undefined) => {
                      setFromDateFilter(toDateValue(range?.from));
                      setToDateFilter(toDateValue(range?.to));
                      setSelectedIds(new Set());
                      setPage(1);
                    }}
                  />
                </Popover>
              </MobileFilterField>
            </MobileFilterDrawer>
            <div className="flex min-w-0 flex-col gap-2 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
              <span className="whitespace-nowrap">
                {totalItems} transactions
              </span>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    disabled={isExporting || totalItems === 0}
                    onClick={() => setExportDropdownOpen((open) => !open)}
                  >
                    <FileDown className="size-4" />
                    Ekspor
                  </Button>
                  {exportDropdownOpen ? (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setExportDropdownOpen(false)}
                      />
                      <div className="absolute right-0 top-11 z-40 w-48 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                          onClick={() => {
                            setExportDropdownOpen(false);
                            void exportToExcel();
                          }}
                        >
                          <FileSpreadsheet className="size-4 text-emerald-600" />
                          Ekspor Excel (.csv)
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                          onClick={() => {
                            setExportDropdownOpen(false);
                            void exportToPdf();
                          }}
                        >
                          <FileText className="size-4 text-rose-600" />
                          Ekspor PDF (.pdf)
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
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
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
          <div className="relative hidden w-full max-w-full overflow-x-auto overscroll-x-contain rounded-2xl border border-zinc-100 md:block">
            {isTableLoading ? (
              <div className="absolute inset-0 z-10 grid min-h-72 place-items-center bg-white/80">
                <LoaderCircle className="size-6 animate-spin text-zinc-500" />
              </div>
            ) : null}
            <Table className="min-w-[1120px]">
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
                  <TableHead className="min-w-[120px]">ID</TableHead>
                  <TableHead className="min-w-[150px]">Date & Time</TableHead>
                  <TableHead className="min-w-[180px]">Device</TableHead>
                  <TableHead className="min-w-[130px]">Payment</TableHead>
                  <TableHead className="min-w-[150px]">Package</TableHead>
                  <TableHead className="min-w-[140px]">Amount net</TableHead>
                  <TableHead className="min-w-[110px]">Status</TableHead>
                  <TableHead className="w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((transaction: Transaction) => {
                  const paymentMethod =
                    getTransactionPaymentMethod(transaction);
                  const netAmount = getTransactionNetAmount(
                    transaction,
                    config,
                  );
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
                      <TableCell className="max-w-[190px] break-words">
                        {transaction.device}
                      </TableCell>
                      <TableCell>
                        {renderPaymentMethod(paymentMethod)}
                      </TableCell>
                      <TableCell className="max-w-[150px] break-words">
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
                {filtered.length === 0 && !isTableLoading && (
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
          <div className="relative space-y-3 md:hidden">
            {isTableLoading ? (
              <div className="absolute inset-0 z-10 grid min-h-72 place-items-center rounded-2xl bg-white/80">
                <LoaderCircle className="size-6 animate-spin text-zinc-500" />
              </div>
            ) : null}
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
                    "min-w-0 overflow-hidden rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm",
                    transaction.isArchived && "bg-zinc-50 text-zinc-500",
                  )}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
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
                      <p className="mt-2 break-words text-lg font-semibold text-zinc-950">
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
                  <div className="mt-4 grid min-w-0 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-500">Date</p>
                      <p className="mt-1 text-zinc-700">
                        {formatDateTime(transaction.createdAtRaw)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-500">Device</p>
                      <p className="mt-1 break-words text-zinc-900">
                        {transaction.device}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-500">Package</p>
                      <p className="mt-1 break-words text-zinc-900">
                        {transaction.packageName}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-500">Customer</p>
                      <p className="mt-1 break-words text-zinc-900">
                        {transaction.customer}
                      </p>
                    </div>
                    <div className="min-w-0">
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
            {filtered.length === 0 && !isTableLoading && (
              <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-10 text-center text-sm text-zinc-400">
                No transactions found.
              </div>
            )}
          </div>
          <TablePagination
            page={activePage}
            pageSize={pageSize}
            totalItems={totalItems}
            isLoading={isTableLoading}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
