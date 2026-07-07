"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeDollarSign, Clock3, Download, Landmark, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TablePagination } from "@/components/ui/table-pagination";
import { Textarea } from "@/components/ui/textarea";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/features/admin/_components/page-header";
import { StatCard } from "@/features/admin/_components/stat-card";
import { cn } from "@/lib/utils";
import {
  formatPayoutCurrency,
  formatPayoutDate,
  getPayoutStatusClassName,
  getPayoutStatusLabel,
} from "@/features/admin/payout/payout-format";
import { getMyPayoutInvoices, requestPayout, approveInternalPayoutRequest, rejectInternalPayoutRequest, cancelInternalPayoutRequest } from "@/server/admin/actions/payout-actions";
import { usePermission } from "@/features/admin/hooks/use-permission";
import type {
  PayoutAvailableLedgerEntry,
  PayoutInvoice,
  PayoutSummary,
} from "@/types/payout";
import type { PaginatedResult } from "@/types/pagination";

export function PayoutDashboard({
  summary,
  invoicesPage,
  availableLedgerEntries,
}: {
  summary: PayoutSummary;
  invoicesPage: PaginatedResult<PayoutInvoice>;
  availableLedgerEntries: PayoutAvailableLedgerEntry[];
}) {
  const router = useRouter();
  const { isReadOnly } = usePermission();
  const [invoicePage, setInvoicePage] = useState(invoicesPage);
  const [requestOpen, setRequestOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PayoutInvoice | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const [requestForm, setRequestForm] = useState({
    amount: summary.availableNetAmount,
  });
  const invoices = invoicePage.items;

  const hasAccount = Boolean(summary.payoutAccount);
  const canRequest =
    hasAccount &&
    summary.availableNetAmount > 0 &&
    summary.availableNetAmount >= summary.settings.minimumPayoutAmount;
  const ledgerTotals = availableLedgerEntries.reduce(
    (acc, entry) => ({
      grossAmount: acc.grossAmount + entry.grossAmount,
      feeAmount:
        acc.feeAmount + entry.gatewayFeeAmount + entry.platformFeeAmount,
      netAmount: acc.netAmount + entry.netAmount,
    }),
    { grossAmount: 0, feeAmount: 0, netAmount: 0 },
  );
  const requestEstimate = useMemo(
    () =>
      estimatePayoutRequest(
        availableLedgerEntries,
        requestForm.amount,
        summary.settings,
      ),
    [availableLedgerEntries, requestForm.amount, summary.settings],
  );

  const loadInvoicePage = async (page: number) => {
    startTransition(async () => {
      try {
        const nextPage = await getMyPayoutInvoices({
          page,
          pageSize: invoicePage.pageSize,
        });
        setInvoicePage(nextPage);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load withdrawals");
      }
    });
  };

  const submitRequest = () => {
    if (!summary.payoutAccount) {
      toast.error("Complete the payout account first.");
      return;
    }

    startTransition(async () => {
      const result = await requestPayout({
        amount: requestForm.amount,
        accountId: summary.payoutAccount!.id,
      });
      if (!result.success) {
        toast.error(result.error ?? "Failed to request withdrawal");
        return;
      }
      toast.success("Withdrawal request sent");
      setRequestOpen(false);
      void loadInvoicePage(1);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payout / Withdraw"
        description="Monitor verified QRIS photobooth revenue and request organization withdrawals."
        action={
          <Button
            className="rounded-2xl"
            disabled={!canRequest || isReadOnly("invoices")}
            onClick={() => {
              setRequestForm({
                amount: summary.availableNetAmount,
              });
              setRequestOpen(true);
            }}
          >
            <Download className="size-4" />
            Request withdrawal
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard
          title="Available balance"
          value={formatPayoutCurrency(summary.availableNetAmount)}
          description={`${summary.eligibleTransactionCount} eligible payments`}
          icon={Wallet}
          tone="success"
          variant="spacious"
        />
        <StatCard
          title="Available gross"
          value={formatPayoutCurrency(summary.availableGrossAmount)}
          description={`Fee ${formatPayoutCurrency(summary.availableGatewayFeeAmount + summary.availablePlatformFeeAmount)}`}
          icon={BadgeDollarSign}
          variant="spacious"
        />
        <StatCard
          title="Pending payout"
          value={formatPayoutCurrency(summary.pendingNetAmount)}
          description={`${summary.pendingInvoiceCount} pending requests`}
          icon={Clock3}
          variant="spacious"
        />
        <StatCard
          title="Withdrawn"
          value={formatPayoutCurrency(summary.paidNetAmount)}
          description="Total paid payout"
          icon={Landmark}
          tone="success"
          variant="spacious"
        />
      </div>

      <PayoutSettingsSummary summary={summary} />

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>Available balance details</CardTitle>
            <CardDescription>
              Payment ledger entries that currently form the available balance.
              Entries disappear from this table once they are locked into a payout request.
            </CardDescription>
          </div>
          <div className="grid min-w-64 grid-cols-3 gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-xs">
            <div>
              <div className="text-zinc-500">Gross</div>
              <div className="mt-1 font-semibold text-zinc-950">
                {formatPayoutCurrency(ledgerTotals.grossAmount)}
              </div>
            </div>
            <div>
              <div className="text-zinc-500">Fee</div>
              <div className="mt-1 font-semibold text-zinc-950">
                {formatPayoutCurrency(ledgerTotals.feeAmount)}
              </div>
            </div>
            <div>
              <div className="text-zinc-500">Net</div>
              <div className="mt-1 font-semibold text-zinc-950">
                {formatPayoutCurrency(ledgerTotals.netAmount)}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paid</TableHead>
                <TableHead>Booth / Package</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {availableLedgerEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="text-sm">
                      {formatPayoutDate(entry.paidAt)}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      Verified {formatPayoutDate(entry.verifiedAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{entry.booth ?? "-"}</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {entry.packageName ?? "-"}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {shortCode(entry.merchantOrderId)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {entry.duitkuReference
                      ? shortCode(entry.duitkuReference)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPayoutCurrency(entry.grossAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPayoutCurrency(
                      entry.gatewayFeeAmount + entry.platformFeeAmount,
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatPayoutCurrency(entry.netAmount)}
                  </TableCell>
                </TableRow>
              ))}
              {availableLedgerEntries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-sm text-zinc-500"
                  >
                    No eligible payment ledger entries yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payout / withdraw history</CardTitle>
          <CardDescription>
            Each payout locks its ledger entries so the same revenue cannot be withdrawn twice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payout</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Items</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.invoiceNumber}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getPayoutStatusClassName(invoice.status)}
                    >
                      {getPayoutStatusLabel(invoice.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatPayoutDate(invoice.requestedAt)}</TableCell>
                  <TableCell>{formatPayoutCurrency(invoice.grossAmount)}</TableCell>
                  <TableCell>
                    {formatPayoutCurrency(
                      invoice.gatewayFeeAmount + invoice.platformFeeAmount,
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatPayoutCurrency(invoice.netAmount)}
                  </TableCell>
                  <TableCell>{invoice.items.length}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-8 text-center text-sm text-zinc-500"
                  >
                    No payout requests yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          <TablePagination
            page={invoicePage.page}
            pageSize={invoicePage.pageSize}
            totalItems={invoicePage.totalItems}
            onPageChange={(page) => void loadInvoicePage(page)}
          />
        </CardContent>
      </Card>

      <Dialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        title="Request withdrawal"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Available balance</span>
              <span className="font-semibold text-zinc-950">
                {formatPayoutCurrency(summary.availableNetAmount)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span>Minimum request</span>
              <span className="font-medium text-zinc-700">
                {formatPayoutCurrency(summary.settings.minimumPayoutAmount)}
              </span>
            </div>
          </div>
          <label className="block text-xs font-medium text-zinc-600">
            Request amount
            <Input
              className="mt-1.5"
              type="number"
              min={1}
              max={summary.availableNetAmount}
              value={requestForm.amount}
              onChange={(event) =>
                setRequestForm((current) => ({
                  ...current,
                  amount: Number(event.target.value) || 0,
                }))
              }
            />
          </label>
          <div className="grid gap-2 rounded-2xl border border-zinc-200 bg-white p-3 text-xs md:grid-cols-4">
            <EstimateStat
              label="Gross"
              value={formatPayoutCurrency(requestEstimate.grossAmount)}
            />
            <EstimateStat
              label="Duitku fee"
              value={formatPayoutCurrency(requestEstimate.gatewayFeeAmount)}
            />
            <EstimateStat
              label="POSKART fee"
              value={formatPayoutCurrency(requestEstimate.platformFeeAmount)}
            />
            <EstimateStat
              label="You receive"
              value={formatPayoutCurrency(requestEstimate.netAmount)}
              strong
            />
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-900">
            Fees consist of the Duitku gateway fee per QRIS transaction and the
            one-time POSKART withdrawal fee for this request.
          </div>
          {requestForm.amount < summary.settings.minimumPayoutAmount ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
              Request amount is still below the minimum withdrawal amount.
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRequestOpen(false)}>
              Cancel
            </Button>
            <Button disabled={isPending} onClick={submitRequest}>
              {isPending ? "Sending..." : "Send request"}
            </Button>
          </div>
        </div>
      </Dialog>

      <PayoutDetailDialog
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
}

function PayoutSettingsSummary({
  summary,
}: {
  summary: PayoutSummary;
}) {
  const router = useRouter();
  const account = summary.payoutAccount;

  return (
    <Card>
      <CardContent className="grid gap-6 p-5 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div>
            <CardTitle>Payout account</CardTitle>
            <CardDescription className="mt-1.5">
              Managed from Settings and snapshotted when a withdrawal request is created.
            </CardDescription>
          </div>
          {account ? (
            <div className="grid gap-2">
              <ReadonlyField label="Bank" value={account.bankName} />
              <ReadonlyField
                label="Account number"
                value={account.accountNumber}
              />
              <ReadonlyField
                label="Account holder"
                value={account.accountHolderName}
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
              Payout account is incomplete. Open Settings to configure the
              organization payout account.
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-2xl"
            onClick={() => router.push("/settings")}
          >
            Open Settings
          </Button>
        </div>

        <div className="space-y-4 border-t border-zinc-100 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div>
            <CardTitle>Payout rules summary</CardTitle>
            <CardDescription className="mt-1.5">
              Eligible payments are verified Duitku QRIS payments collected
              through the POSKART payment gateway.
            </CardDescription>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm leading-6 text-zinc-600">
            Gateway fee is the Duitku deduction for each QRIS transaction.
            Platform fee is the one-time POSKART withdrawal fee applied when a
            payout request is created.
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <PayoutRuleStat
              label="Gateway fee fallback"
              value={formatFeeSetting(
                summary.settings.gatewayFeeType,
                summary.settings.gatewayFeePercentage,
                summary.settings.gatewayFeeFixedAmount,
              )}
            />
            <PayoutRuleStat
              label="Platform fee per withdrawal"
              value={formatFeeSetting(
                summary.settings.platformFeeType,
                summary.settings.platformFeePercentage,
                summary.settings.platformFeeFixedAmount,
              )}
            />
            <PayoutRuleStat
              label="Minimum request"
              value={formatPayoutCurrency(summary.settings.minimumPayoutAmount)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EstimateStat({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-zinc-50 px-3 py-2">
      <div className="text-zinc-500">{label}</div>
      <div
        className={cn(
          "mt-1 font-semibold text-zinc-950",
          strong && "text-emerald-700",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function estimatePayoutRequest(
  entries: PayoutAvailableLedgerEntry[],
  requestedAmount: number,
  settings: PayoutSummary["settings"],
) {
  const requestedNetAmount = Math.max(0, Math.round(Number(requestedAmount)));
  let grossAmount = 0;
  let gatewayFeeAmount = 0;
  let ledgerNetAmount = 0;
  let count = 0;

  for (const entry of entries) {
    if (entry.netAmount <= 0) continue;
    if (count > 0 && ledgerNetAmount + entry.netAmount > requestedNetAmount) {
      break;
    }
    if (count === 0 && entry.netAmount > requestedNetAmount) break;

    grossAmount += entry.grossAmount;
    gatewayFeeAmount += entry.gatewayFeeAmount;
    ledgerNetAmount += entry.netAmount;
    count += 1;
  }

  const platformFeeAmount =
    count > 0 ? calculateFrontendConfiguredFee(ledgerNetAmount, settings) : 0;
  const netAmount = Math.max(0, ledgerNetAmount - platformFeeAmount);

  return { count, grossAmount, gatewayFeeAmount, platformFeeAmount, netAmount };
}

function calculateFrontendConfiguredFee(
  baseAmount: number,
  settings: PayoutSummary["settings"],
) {
  if (settings.platformFeeType === "fixed") {
    return Math.max(0, Math.round(settings.platformFeeFixedAmount));
  }
  return Math.max(
    0,
    Math.round((baseAmount * Number(settings.platformFeePercentage ?? 0)) / 100),
  );
}

function formatFeeSetting(
  type: "percentage" | "fixed",
  percentage: number,
  fixedAmount: number,
) {
  return type === "fixed"
    ? formatPayoutCurrency(fixedAmount)
    : `${percentage}%`;
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[104px_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="truncate text-sm font-semibold text-zinc-950">{value}</div>
    </div>
  );
}

function PayoutRuleStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-zinc-950">{value}</div>
    </div>
  );
}

function PayoutAmountMetric({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div
        className={cn(
          "mt-1 font-semibold text-zinc-950",
          strong && "text-emerald-700",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function shortCode(value: string) {
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function PayoutDetailDialog({
  invoice,
  onClose,
}: {
  invoice: PayoutInvoice | null;
  onClose: () => void;
}) {
  const { isOwnerOrAdmin, role } = usePermission();
  const [isPendingAction, startTransition] = useTransition();
  const { confirm, dialog: confirmDialogNode } = useConfirmDialog();
  const [rejectReason, setRejectReason] = useState("");
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  const handleApprove = () => {
    if (!invoice) return;
    startTransition(async () => {
      const result = await approveInternalPayoutRequest(invoice.id);
      if (result.success) {
        toast.success("Withdrawal draft approved");
        onClose();
      } else {
        toast.error(result.error ?? "Failed to approve withdrawal draft");
      }
    });
  };

  const handleReject = () => {
    setIsRejectOpen(true);
    setRejectReason("");
  };

  const submitReject = () => {
    if (!invoice) return;
    if (!rejectReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    startTransition(async () => {
      const result = await rejectInternalPayoutRequest(invoice.id, rejectReason);
      if (result.success) {
        toast.success("Withdrawal draft rejected");
        setIsRejectOpen(false);
        onClose();
      } else {
        toast.error(result.error ?? "Failed to reject withdrawal draft");
      }
    });
  };

  const handleCancel = () => {
    if (!invoice) return;
    confirm({
        title: "Cancel withdrawal draft?",
              description:
                "Are you sure you want to cancel this withdrawal draft? Locked ledger entries will be released.",
              confirmLabel: "Cancel draft",
      cancelLabel: "Close",
      destructive: true,
      onConfirm: () => {
        startTransition(async () => {
          const result = await cancelInternalPayoutRequest(invoice.id);
          if (result.success) {
            toast.success("Withdrawal draft canceled");
            onClose();
          } else {
            toast.error(result.error ?? "Failed to cancel withdrawal draft");
          }
        });
      },
    });
  };

  return (
    <Dialog
      open={Boolean(invoice)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={invoice ? invoice.invoiceNumber : "Payout detail"}
      className="max-w-4xl"
    >
      {invoice ? (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 p-4">
              <div className="text-xs text-zinc-500">Account</div>
              <div className="mt-2 text-sm font-semibold">
                {invoice.accountSnapshot.bankName ?? "-"}
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                {invoice.accountSnapshot.accountNumber ?? "-"} -{" "}
                {invoice.accountSnapshot.accountHolderName ?? "-"}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 p-4">
              <div className="text-xs text-zinc-500">Net payout</div>
              <div className="mt-2 text-lg font-semibold">
                {formatPayoutCurrency(invoice.netAmount)}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 p-4">
              <div className="text-xs text-zinc-500">Payment reference</div>
              <div className="mt-2 text-sm font-semibold">
                {invoice.paymentReference ?? "-"}
              </div>
            </div>
          </div>
          <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm md:grid-cols-4">
            <PayoutAmountMetric
              label="Gross"
              value={formatPayoutCurrency(invoice.grossAmount)}
            />
            <PayoutAmountMetric
              label="Duitku fee"
              value={formatPayoutCurrency(invoice.gatewayFeeAmount)}
            />
            <PayoutAmountMetric
              label="Withdrawal fee"
              value={formatPayoutCurrency(invoice.platformFeeAmount)}
            />
            <PayoutAmountMetric
              label="You receive"
              value={formatPayoutCurrency(invoice.netAmount)}
              strong
            />
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-900">
            Duitku fee comes from each QRIS transaction. The POSKART withdrawal
            fee is charged once for this payout request.
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Booth</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">
                    {item.transactionId ?? item.ledgerEntryId ?? "-"}
                  </TableCell>
                  <TableCell>{formatPayoutDate(item.transactionPaidAt)}</TableCell>
                  <TableCell>{item.booth ?? "-"}</TableCell>
                  <TableCell>{item.packageName ?? "-"}</TableCell>
                  <TableCell>{formatPayoutCurrency(item.grossAmount)}</TableCell>
                  <TableCell>
                    {formatPayoutCurrency(
                      item.gatewayFeeAmount + item.platformFeeAmount,
                    )}
                  </TableCell>
                  <TableCell>{formatPayoutCurrency(item.netAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {invoice.status === "pending_approval" && (
            <div className="flex justify-end gap-2 pt-4">
              {isOwnerOrAdmin ? (
                <>
                  <Button
                    variant="destructive"
                    disabled={isPendingAction}
                    onClick={handleReject}
                  >
                    Reject draft
                  </Button>
                  <Button
                    disabled={isPendingAction}
                    onClick={handleApprove}
                  >
                    Approve withdrawal
                  </Button>
                </>
              ) : role === "akuntan" ? (
                <Button
                  variant="outline"
                  disabled={isPendingAction}
                  onClick={handleCancel}
                >
                  Cancel draft
                </Button>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      <Dialog
        open={isRejectOpen}
        onOpenChange={setIsRejectOpen}
        title="Reject withdrawal draft"
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-zinc-500">
            Provide a rejection reason so the accountant understands why this draft was rejected.
          </p>
          <Textarea
            placeholder="Rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            disabled={isPendingAction}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              disabled={isPendingAction}
              onClick={() => setIsRejectOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isPendingAction}
              onClick={submitReject}
            >
              {isPendingAction ? "Processing..." : "Reject draft"}
            </Button>
          </div>
        </div>
      </Dialog>
      {confirmDialogNode}
    </Dialog>
  );
}
