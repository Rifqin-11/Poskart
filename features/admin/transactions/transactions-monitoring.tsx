"use client";

import { type ComponentType, type ReactNode, useMemo, useState } from "react";
import { Banknote, Printer, ReceiptText } from "lucide-react";
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
  useRequestTransactionAction,
  useTransactions,
} from "@/features/admin/transactions/use-transactions";
import { useAppConfig } from "@/features/admin/settings/use-settings";
import { formatCurrency, formatDateTime } from "@/lib/utils";
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
  if (action === "verify") return "Verifikasi";
  if (action === "refund") return "Refund";
  return "Arsip";
}

function getTransactionActionItems(
  transaction: Transaction,
  onRequest: (transaction: Transaction, action: TransactionActionType) => void,
) {
  const items: { label: string; onClick: () => void; destructive?: boolean }[] =
    [];

  if (transaction.status !== "paid" && transaction.status !== "refunded") {
    items.push({
      label: "Verifikasi",
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

  items.push({
    label: "Arsip",
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
      <div>Bruto {formatCurrency(gross)}</div>
      <div>potongan {feeLabel}</div>
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
  const { data = [] } = useTransactions();
  const { data: config } = useAppConfig();
  const requestAction = useRequestTransactionAction();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [packageFilter, setPackageFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
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
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
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
      const isPaid = transaction.status === "paid";
      const netAmount = getTransactionNetAmount(transaction, config);
      return {
        revenue: acc.revenue + (isPaid ? netAmount : 0),
        printCount: acc.printCount + (isPaid ? transaction.printCount : 0),
        transactionCount: acc.transactionCount + 1,
        paidCount: acc.paidCount + (isPaid ? 1 : 0),
        grossRevenue: acc.grossRevenue + (isPaid ? transaction.amount : 0),
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
        `${getTransactionActionLabel(action)} menunggu approval Super Admin.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal membuat request",
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
            label="Jumlah pendapatan"
            value={formatCurrency(summary.revenue)}
            description={
              <div className="space-y-0.5">
                <div>Bruto {formatCurrency(summary.grossRevenue)}</div>
                <div>potongan QRIS {getConfiguredFeeRuleLabel(config)}</div>
              </div>
            }
          />
          <TransactionSummaryMetric
            icon={Printer}
            label="Jumlah print"
            value={`${summary.printCount} print`}
            description="Dari transaksi paid"
          />
          <TransactionSummaryMetric
            icon={ReceiptText}
            label="Jumlah transaksi"
            value={`${summary.transactionCount} transaksi`}
            description={
              hasActiveFilters
                ? `Hasil filter dari ${data.length} transaksi`
                : "Semua transaksi"
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
                  setPage(1);
                }}
              />
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </Select>
              <Select
                value={paymentMethodFilter}
                onChange={(e) => {
                  setPaymentMethodFilter(e.target.value);
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
                  setPage(1);
                }}
              >
                Reset
              </Button>
            </div>
            <div className="text-xs text-zinc-500 flex items-center gap-4">
              <span>
                {filtered.length} of {data.length} transactions
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="hidden overflow-x-auto xl:block">
            <Table className="min-w-180">
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Tanggal & Jam</TableHead>
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
                    <TableRow key={transaction.id}>
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
                        {renderTransactionStatus(transaction.status)}
                      </TableCell>
                      <TableCell>
                        {transaction.pendingAction ? (
                          <Badge variant="warning">
                            {getTransactionActionLabel(
                              transaction.pendingAction.action,
                            )}
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-1">
                            <DropdownMenu
                              items={getTransactionActionItems(
                                transaction,
                                (selectedTransaction, action) =>
                                  void handleRequestAction(
                                    selectedTransaction,
                                    action,
                                  ),
                              )}
                            />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
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
                  className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {renderPaymentMethod(paymentMethod)}
                        {renderTransactionStatus(transaction.status)}
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
                      <p className="text-xs text-zinc-500">Tanggal</p>
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
                        Menunggu approval Super Admin
                      </span>
                    ) : (
                      <DropdownMenu
                        items={getTransactionActionItems(
                          transaction,
                          (selectedTransaction, action) =>
                            void handleRequestAction(
                              selectedTransaction,
                              action,
                            ),
                        )}
                      />
                    )}
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
