"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeDollarSign,
  Clock3,
  Download,
  Landmark,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TablePagination } from "@/components/ui/table-pagination";
import { Textarea } from "@/components/ui/textarea";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/features/admin/_components/page-header";
import { StatCard } from "@/features/admin/_components/stat-card";
import { cn } from "@/lib/utils";
import {
  formatPayoutCurrency,
  formatPayoutDate,
  getPayoutStatusClassName,
  getPayoutStatusLabel,
} from "@/features/admin/payout/payout-format";
import {
  getMyAvailablePayoutLedgerEntries,
  getMyPayoutInvoices,
  requestPayout,
  approveInternalPayoutRequest,
  rejectInternalPayoutRequest,
  cancelInternalPayoutRequest,
} from "@/server/admin/actions/payout-actions";
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
  availableLedgerPage,
}: {
  summary: PayoutSummary;
  invoicesPage: PaginatedResult<PayoutInvoice>;
  availableLedgerPage: PaginatedResult<PayoutAvailableLedgerEntry>;
}) {
  const router = useRouter();
  const { isReadOnly } = usePermission();
  const [invoicePage, setInvoicePage] = useState(invoicesPage);
  const [ledgerPage, setLedgerPage] = useState(availableLedgerPage);
  const [requestOpen, setRequestOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PayoutInvoice | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const [requestForm, setRequestForm] = useState({
    amount: summary.availableGrossAmount,
  });
  const invoices = invoicePage.items;
  const availableLedgerEntries = ledgerPage.items;

  const hasAccount = Boolean(summary.payoutAccount);
  const canRequest =
    hasAccount &&
    summary.availableGrossAmount > 0 &&
    summary.availableGrossAmount >= summary.settings.minimumPayoutAmount;
  const requestEstimate = useMemo(
    () =>
      estimatePayoutRequest(
        requestForm.amount,
        summary.availableGrossAmount,
        summary.availableGatewayFeeAmount,
        summary.settings,
      ),
    [
      requestForm.amount,
      summary.availableGrossAmount,
      summary.availableGatewayFeeAmount,
      summary.settings,
    ],
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
        toast.error(
          error instanceof Error ? error.message : "Failed to load withdrawals",
        );
      }
    });
  };

  const loadLedgerPage = async (page: number) => {
    startTransition(async () => {
      try {
        const nextPage = await getMyAvailablePayoutLedgerEntries({
          page,
          pageSize: ledgerPage.pageSize,
        });
        setLedgerPage(nextPage);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load available payout entries",
        );
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
            className="w-full rounded-2xl sm:w-auto"
            disabled={!canRequest || isReadOnly("invoices")}
            onClick={() => {
              setRequestForm({
                amount: summary.availableGrossAmount,
              });
              setRequestOpen(true);
            }}
          >
            <Download className="size-4" />
            Request withdrawal
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Available balance details</CardTitle>
            <CardDescription>
              Payment ledger entries that currently form the available balance.
              A partially allocated payment remains here with only its remaining
              balance.
            </CardDescription>
          </div>
          <div className="grid w-full grid-cols-3 gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-xs lg:w-auto lg:min-w-64">
            <div>
              <div className="text-zinc-500">Gross</div>
              <div className="mt-1 font-semibold text-zinc-950">
                {formatPayoutCurrency(summary.availableGrossAmount)}
              </div>
            </div>
            <div>
              <div className="text-zinc-500">Fee</div>
              <div className="mt-1 font-semibold text-zinc-950">
                {formatPayoutCurrency(
                  summary.availableGatewayFeeAmount +
                    summary.availablePlatformFeeAmount,
                )}
              </div>
            </div>
            <div>
              <div className="text-zinc-500">Net</div>
              <div className="mt-1 font-semibold text-zinc-950">
                {formatPayoutCurrency(summary.availableNetAmount)}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[820px]">
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
          </div>
          <div className="grid gap-3 md:hidden">
            {availableLedgerEntries.map((entry) => (
              <LedgerEntryCard key={entry.id} entry={entry} />
            ))}
            {availableLedgerEntries.length === 0 ? (
              <EmptyMobileCard message="No eligible payment ledger entries yet." />
            ) : null}
          </div>
          <TablePagination
            page={ledgerPage.page}
            pageSize={ledgerPage.pageSize}
            totalItems={ledgerPage.totalItems}
            onPageChange={(page) => void loadLedgerPage(page)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payout / withdraw history</CardTitle>
          <CardDescription>
            Each payout locks its ledger entries so the same revenue cannot be
            withdrawn twice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[780px]">
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
                    <TableCell>
                      {formatPayoutDate(invoice.requestedAt)}
                    </TableCell>
                    <TableCell>
                      {formatPayoutCurrency(invoice.grossAmount)}
                    </TableCell>
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
          </div>
          <div className="grid gap-3 md:hidden">
            {invoices.map((invoice) => (
              <PayoutInvoiceCard
                key={invoice.id}
                invoice={invoice}
                onDetails={() => setSelectedInvoice(invoice)}
              />
            ))}
            {invoices.length === 0 ? (
              <EmptyMobileCard message="No payout requests yet." />
            ) : null}
          </div>
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
        className="max-w-lg"
      >
        <div className="space-y-3 sm:space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm leading-6 text-zinc-600 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Available gross</span>
              <span className="font-semibold text-zinc-950">
                {formatPayoutCurrency(summary.availableGrossAmount)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span>Minimum request</span>
              <span className="font-medium text-zinc-700">
                {formatPayoutCurrency(summary.settings.minimumPayoutAmount)}
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-xs font-medium text-zinc-600">
              <label htmlFor="payout-request-amount">
                Gross request amount
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 rounded-full px-3 text-xs"
                onClick={() =>
                  setRequestForm((current) => ({
                    ...current,
                    amount: summary.availableGrossAmount,
                  }))
                }
              >
                Max
              </Button>
            </div>
            <Input
              id="payout-request-amount"
              className="h-11"
              type="number"
              min={1}
              max={summary.availableGrossAmount}
              value={requestForm.amount}
              onChange={(event) =>
                setRequestForm((current) => ({
                  ...current,
                  amount: Number(event.target.value) || 0,
                }))
              }
            />
            <p className="text-xs leading-5 text-zinc-500">
              Fees are deducted from this gross amount. The final received
              amount is shown below.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200 bg-white p-2 text-xs sm:grid-cols-4 sm:p-3">
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
          <div className="grid grid-cols-2 gap-2 pt-1 sm:flex sm:justify-end">
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

function PayoutSettingsSummary({ summary }: { summary: PayoutSummary }) {
  const router = useRouter();
  const account = summary.payoutAccount;

  return (
    <Card>
      <CardContent className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:gap-6">
        <div className="space-y-4">
          <div>
            <CardTitle>Payout account</CardTitle>
            <CardDescription className="mt-1.5">
              Managed from Settings and snapshotted when a withdrawal request is
              created.
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

function LedgerEntryCard({ entry }: { entry: PayoutAvailableLedgerEntry }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-950">
            {entry.booth ?? "-"}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            {entry.packageName ?? "-"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-emerald-700">
            {formatPayoutCurrency(entry.netAmount)}
          </div>
          <div className="mt-1 text-xs text-zinc-500">Net</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <MobileMeta label="Paid" value={formatPayoutDate(entry.paidAt)} />
        <MobileMeta
          label="Verified"
          value={formatPayoutDate(entry.verifiedAt)}
        />
        <MobileMeta
          label="Order"
          value={shortCode(entry.merchantOrderId)}
          mono
        />
        <MobileMeta
          label="Reference"
          value={entry.duitkuReference ? shortCode(entry.duitkuReference) : "-"}
          mono
        />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-zinc-50 p-3 text-xs">
        <MobileAmount label="Gross" value={entry.grossAmount} />
        <MobileAmount
          label="Fee"
          value={entry.gatewayFeeAmount + entry.platformFeeAmount}
        />
        <MobileAmount label="Net" value={entry.netAmount} strong />
      </div>
    </div>
  );
}

function PayoutInvoiceCard({
  invoice,
  onDetails,
}: {
  invoice: PayoutInvoice;
  onDetails: () => void;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-950">
            {invoice.invoiceNumber}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            {formatPayoutDate(invoice.requestedAt)}
          </div>
        </div>
        <Badge
          variant="outline"
          className={getPayoutStatusClassName(invoice.status)}
        >
          {getPayoutStatusLabel(invoice.status)}
        </Badge>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-zinc-50 p-3 text-xs">
        <MobileAmount label="Gross" value={invoice.grossAmount} />
        <MobileAmount
          label="Fee"
          value={invoice.gatewayFeeAmount + invoice.platformFeeAmount}
        />
        <MobileAmount label="Net" value={invoice.netAmount} strong />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-xs text-zinc-500">
          {invoice.items.length} items
        </div>
        <Button variant="outline" size="sm" onClick={onDetails}>
          Details
        </Button>
      </div>
    </div>
  );
}

function PayoutInvoiceItemCard({
  item,
}: {
  item: PayoutInvoice["items"][number];
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-950">
            {item.booth ?? "-"}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            {item.packageName ?? "-"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-emerald-700">
            {formatPayoutCurrency(item.netAmount)}
          </div>
          <div className="mt-1 text-xs text-zinc-500">Net</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <MobileMeta
          label="Transaction"
          value={item.transactionId ?? item.ledgerEntryId ?? "-"}
          mono
        />
        <MobileMeta
          label="Time"
          value={formatPayoutDate(item.transactionPaidAt)}
        />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-zinc-50 p-3 text-xs">
        <MobileAmount label="Gross" value={item.grossAmount} />
        <MobileAmount
          label="Fee"
          value={item.gatewayFeeAmount + item.platformFeeAmount}
        />
        <MobileAmount label="Net" value={item.netAmount} strong />
      </div>
    </div>
  );
}

function EmptyMobileCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
      {message}
    </div>
  );
}

function MobileMeta({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-zinc-500">{label}</div>
      <div
        className={cn(
          "mt-1 truncate font-medium text-zinc-950",
          mono && "font-mono",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function MobileAmount({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-zinc-500">{label}</div>
      <div
        className={cn(
          "mt-1 truncate font-semibold text-zinc-950",
          strong && "text-emerald-700",
        )}
      >
        {formatPayoutCurrency(value)}
      </div>
    </div>
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
  requestedAmount: number,
  availableGrossAmount: number,
  availableGatewayFeeAmount: number,
  settings: PayoutSummary["settings"],
) {
  const grossAmount = Math.min(
    Math.max(0, Math.round(Number(requestedAmount))),
    Math.max(0, Math.round(Number(availableGrossAmount))),
  );
  const ratio = availableGrossAmount > 0 ? grossAmount / availableGrossAmount : 0;
  const gatewayFeeAmount = Math.min(
    Math.max(0, Math.round(Number(availableGatewayFeeAmount))),
    Math.max(0, Math.round(availableGatewayFeeAmount * ratio)),
  );
  const ledgerNetAmount = Math.max(0, grossAmount - gatewayFeeAmount);
  const platformFeeAmount =
    grossAmount > 0 ? calculateFrontendConfiguredFee(ledgerNetAmount, settings) : 0;
  const netAmount = Math.max(0, ledgerNetAmount - platformFeeAmount);

  return {
    grossAmount,
    gatewayFeeAmount,
    platformFeeAmount,
    netAmount,
  };
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
    Math.round(
      (baseAmount * Number(settings.platformFeePercentage ?? 0)) / 100,
    ),
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
    <div className="grid gap-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 sm:grid-cols-[104px_minmax(0,1fr)] sm:items-center sm:gap-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="truncate text-sm font-semibold text-zinc-950">
        {value}
      </div>
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
      const result = await rejectInternalPayoutRequest(
        invoice.id,
        rejectReason,
      );
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
        <div className="space-y-4 sm:space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 p-3 sm:p-4">
              <div className="text-xs text-zinc-500">Account</div>
              <div className="mt-2 text-sm font-semibold">
                {invoice.accountSnapshot.bankName ?? "-"}
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                {invoice.accountSnapshot.accountNumber ?? "-"} -{" "}
                {invoice.accountSnapshot.accountHolderName ?? "-"}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 p-3 sm:p-4">
              <div className="text-xs text-zinc-500">Net payout</div>
              <div className="mt-2 text-lg font-semibold">
                {formatPayoutCurrency(invoice.netAmount)}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 p-3 sm:p-4">
              <div className="text-xs text-zinc-500">Payment reference</div>
              <div className="mt-2 break-all text-sm font-semibold">
                {invoice.paymentReference ?? "-"}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-xs sm:text-sm md:grid-cols-4 md:gap-3">
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
          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[760px]">
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
                    <TableCell>
                      {formatPayoutDate(item.transactionPaidAt)}
                    </TableCell>
                    <TableCell>{item.booth ?? "-"}</TableCell>
                    <TableCell>{item.packageName ?? "-"}</TableCell>
                    <TableCell>
                      {formatPayoutCurrency(item.grossAmount)}
                    </TableCell>
                    <TableCell>
                      {formatPayoutCurrency(
                        item.gatewayFeeAmount + item.platformFeeAmount,
                      )}
                    </TableCell>
                    <TableCell>
                      {formatPayoutCurrency(item.netAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-3 md:hidden">
            {invoice.items.map((item) => (
              <PayoutInvoiceItemCard key={item.id} item={item} />
            ))}
            {invoice.items.length === 0 ? (
              <EmptyMobileCard message="No transaction items in this payout." />
            ) : null}
          </div>

          {invoice.status === "pending_approval" && (
            <div className="grid gap-2 pt-2 sm:flex sm:justify-end sm:pt-4">
              {isOwnerOrAdmin ? (
                <>
                  <Button
                    variant="destructive"
                    disabled={isPendingAction}
                    onClick={handleReject}
                  >
                    Reject draft
                  </Button>
                  <Button disabled={isPendingAction} onClick={handleApprove}>
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
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-zinc-500">
            Provide a rejection reason so the accountant understands why this
            draft was rejected.
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
