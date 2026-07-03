"use client";

import { useMemo, useState } from "react";
import { Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
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
  useDeleteTransaction,
  useDeleteTransactions,
  useTransactions,
  useUpdateTransaction,
} from "@/features/admin/transactions/use-transactions";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Transaction } from "@/types/transaction";

import { TransactionDetailsDialog } from "./_components/transaction-details-dialog";

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

function getTransactionDateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function TransactionsMonitoring() {
  const { data = [] } = useTransactions();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const deleteTransactions = useDeleteTransactions();
  const confirmDelete = useConfirmDialog();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [packageFilter, setPackageFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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

  async function handleDelete(id: string) {
    await deleteTransaction.mutateAsync(id);
    toast.success("Transaction deleted");
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    setDeletingId(null);
  }

  function handleDeleteSelected() {
    confirmDelete.confirm({
      title: "Hapus transaksi terpilih?",
      description: `Apakah Anda yakin ingin menghapus ${selectedIds.length} transaksi yang dipilih? Data tidak dapat dikembalikan.`,
      confirmLabel: "Hapus Semua",
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteTransactions.mutateAsync(selectedIds);
          toast.success(`${selectedIds.length} transaksi berhasil dihapus`);
          setSelectedIds([]);
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Gagal menghapus transaksi",
          );
        }
      },
    });
  }

  return (
    <div>
      {confirmDelete.dialog}
      <PageHeader
        title="Transaction & QRIS Monitoring"
        description="Track live payments, failed logs, manual verification, retry, and refund tools."
      />

      <TransactionDetailsDialog
        transaction={editing}
        submitting={updateTransaction.isPending}
        onClose={() => setEditing(null)}
        onSubmit={async (patch) => {
          if (!editing) return;
          await updateTransaction.mutateAsync({
            id: editing.id,
            patch,
          });
          toast.success("Transaction updated");
          setEditing(null);
        }}
      />

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
              {selectedIds.length > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1.5 animate-in fade-in duration-200"
                >
                  <Trash2 className="size-3.5" /> Hapus Terpilih (
                  {selectedIds.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="hidden xl:block overflow-x-auto">
            <Table className="min-w-[1120px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-950 accent-zinc-900 cursor-pointer"
                      checked={
                        filtered.length > 0 &&
                        filtered.every((t) => selectedIds.includes(t.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds((prev) => {
                            const newIds = [...prev];
                            filtered.forEach((t) => {
                              if (!newIds.includes(t.id)) newIds.push(t.id);
                            });
                            return newIds;
                          });
                          return;
                        }
                        setSelectedIds((prev) =>
                          prev.filter(
                            (id) => !filtered.some((t) => t.id === id),
                          ),
                        );
                      }}
                      aria-label="Pilih semua transaksi"
                    />
                  </TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Tanggal & Jam</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((transaction: Transaction) => {
                  const paymentMethod =
                    getTransactionPaymentMethod(transaction);

                  return (
                    <TableRow
                      key={transaction.id}
                      className={
                        selectedIds.includes(transaction.id)
                          ? "bg-zinc-50/60"
                          : ""
                      }
                    >
                      <TableCell className="w-12">
                        <input
                          type="checkbox"
                          className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-950 accent-zinc-900 cursor-pointer"
                          checked={selectedIds.includes(transaction.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) => [
                                ...prev,
                                transaction.id,
                              ]);
                              return;
                            }
                            setSelectedIds((prev) =>
                              prev.filter((id) => id !== transaction.id),
                            );
                          }}
                          aria-label={`Pilih transaksi ${transaction.id.slice(0, 8)}`}
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
                      <TableCell className="whitespace-nowrap">
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        {renderTransactionStatus(transaction.status)}
                      </TableCell>
                      <TableCell>
                        {deletingId === transaction.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500">
                              Delete?
                            </span>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={deleteTransaction.isPending}
                              onClick={() => void handleDelete(transaction.id)}
                            >
                              {deleteTransaction.isPending ? "…" : "Yes"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeletingId(null)}
                            >
                              No
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditing(transaction)}
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => setDeletingId(transaction.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                            <DropdownMenu
                              items={[
                                {
                                  label: "Manual verify",
                                  onClick: () =>
                                    toast.success("Payment verified"),
                                },
                                {
                                  label: "Retry QRIS",
                                  onClick: () => toast.message("Retry sent"),
                                },
                                {
                                  label: "Refund",
                                  destructive: true,
                                  onClick: () => toast.error("Refund queued"),
                                },
                              ]}
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

              return (
                <div
                  key={transaction.id}
                  className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {renderPaymentMethod(paymentMethod)}
                        {renderTransactionStatus(transaction.status)}
                      </div>
                      <p className="mt-2 break-all font-mono text-xs text-zinc-500">
                        {transaction.id}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-950 accent-zinc-900 cursor-pointer"
                      checked={selectedIds.includes(transaction.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds((prev) => [...prev, transaction.id]);
                          return;
                        }
                        setSelectedIds((prev) =>
                          prev.filter((id) => id !== transaction.id),
                        );
                      }}
                      aria-label={`Pilih transaksi ${transaction.id.slice(0, 8)}`}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
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
                      <p className="text-xs text-zinc-500">Amount</p>
                      <p className="mt-1 font-medium text-zinc-900">
                        {formatCurrency(transaction.amount)}
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
                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                    {deletingId === transaction.id ? (
                      <>
                        <span className="mr-auto text-xs text-zinc-500">
                          Delete?
                        </span>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={deleteTransaction.isPending}
                          onClick={() => void handleDelete(transaction.id)}
                        >
                          {deleteTransaction.isPending ? "…" : "Yes"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeletingId(null)}
                        >
                          No
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditing(transaction)}
                        >
                          <Edit2 className="size-3.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => setDeletingId(transaction.id)}
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </Button>
                        <DropdownMenu
                          items={[
                            {
                              label: "Manual verify",
                              onClick: () => toast.success("Payment verified"),
                            },
                            {
                              label: "Retry QRIS",
                              onClick: () => toast.message("Retry sent"),
                            },
                            {
                              label: "Refund",
                              destructive: true,
                              onClick: () => toast.error("Refund queued"),
                            },
                          ]}
                        />
                      </>
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
