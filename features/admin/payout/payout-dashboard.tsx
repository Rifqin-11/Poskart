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
import { requestPayout } from "@/server/admin/actions/payout-actions";
import type {
  PayoutAvailableLedgerEntry,
  PayoutInvoice,
  PayoutSummary,
} from "@/types/payout";

export function PayoutDashboard({
  summary,
  invoices,
  availableLedgerEntries,
}: {
  summary: PayoutSummary;
  invoices: PayoutInvoice[];
  availableLedgerEntries: PayoutAvailableLedgerEntry[];
}) {
  const router = useRouter();
  const [requestOpen, setRequestOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PayoutInvoice | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const [requestForm, setRequestForm] = useState({
    amount: summary.availableNetAmount,
  });

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

  const submitRequest = () => {
    if (!summary.payoutAccount) {
      toast.error("Lengkapi rekening payout terlebih dahulu.");
      return;
    }

    startTransition(async () => {
      const result = await requestPayout({
        amount: requestForm.amount,
        accountId: summary.payoutAccount!.id,
      });
      if (!result.success) {
        toast.error(result.error ?? "Gagal request pencairan");
        return;
      }
      toast.success("Request pencairan terkirim");
      setRequestOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoice Pencairan"
        description="Pantau saldo hasil QRIS photobooth dan ajukan pencairan dana organisasi."
        action={
          <Button
            className="rounded-2xl"
            disabled={!canRequest}
            onClick={() => {
              setRequestForm({
                amount: summary.availableNetAmount,
              });
              setRequestOpen(true);
            }}
          >
            <Download className="size-4" />
            Request pencairan
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard
          title="Saldo tersedia"
          value={formatPayoutCurrency(summary.availableNetAmount)}
          description={`${summary.eligibleTransactionCount} pembayaran eligible`}
          icon={Wallet}
          tone="success"
          variant="spacious"
        />
        <StatCard
          title="Gross tersedia"
          value={formatPayoutCurrency(summary.availableGrossAmount)}
          description={`Fee ${formatPayoutCurrency(summary.availableGatewayFeeAmount + summary.availablePlatformFeeAmount)}`}
          icon={BadgeDollarSign}
          variant="spacious"
        />
        <StatCard
          title="Pending payout"
          value={formatPayoutCurrency(summary.pendingNetAmount)}
          description={`${summary.pendingInvoiceCount} invoice menunggu`}
          icon={Clock3}
          variant="spacious"
        />
        <StatCard
          title="Sudah dicairkan"
          value={formatPayoutCurrency(summary.paidNetAmount)}
          description="Total invoice paid"
          icon={Landmark}
          tone="success"
          variant="spacious"
        />
      </div>

      <PayoutSettingsSummary summary={summary} />

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>Rincian saldo tersedia</CardTitle>
            <CardDescription>
              Daftar ledger pembayaran yang membentuk saldo tersedia saat ini.
              Jika item masuk invoice, item akan hilang dari tabel ini.
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
                    Belum ada ledger pembayaran eligible.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat invoice pencairan</CardTitle>
          <CardDescription>
            Setiap invoice mengunci daftar ledger sehingga tidak bisa dobel
            dicairkan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
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
                      Detail
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
                    Belum ada invoice pencairan.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        title="Request pencairan"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Saldo tersedia</span>
              <span className="font-semibold text-zinc-950">
                {formatPayoutCurrency(summary.availableNetAmount)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span>Minimal request</span>
              <span className="font-medium text-zinc-700">
                {formatPayoutCurrency(summary.settings.minimumPayoutAmount)}
              </span>
            </div>
          </div>
          <label className="block text-xs font-medium text-zinc-600">
            Nominal request
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
              label="Potongan Duitku"
              value={formatPayoutCurrency(requestEstimate.gatewayFeeAmount)}
            />
            <EstimateStat
              label="Potongan POSKART"
              value={formatPayoutCurrency(requestEstimate.platformFeeAmount)}
            />
            <EstimateStat
              label="Didapat"
              value={formatPayoutCurrency(requestEstimate.netAmount)}
              strong
            />
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-900">
            Biaya terdiri dari gateway fee Duitku per transaksi QRIS dan biaya
            penarikan POSKART satu kali untuk request pencairan ini.
          </div>
          {requestForm.amount < summary.settings.minimumPayoutAmount ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
              Nominal request masih di bawah minimal pencairan.
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRequestOpen(false)}>
              Batal
            </Button>
            <Button disabled={isPending} onClick={submitRequest}>
              {isPending ? "Mengirim..." : "Kirim request"}
            </Button>
          </div>
        </div>
      </Dialog>

      <InvoiceDetailDialog
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
            <CardTitle>Rekening pencairan</CardTitle>
            <CardDescription className="mt-1.5">
              Dikelola dari Settings dan disnapshot saat request pencairan
              dibuat.
            </CardDescription>
          </div>
          {account ? (
            <div className="grid gap-2">
              <ReadonlyField label="Bank" value={account.bankName} />
              <ReadonlyField
                label="Nomor rekening"
                value={account.accountNumber}
              />
              <ReadonlyField
                label="Nama pemilik"
                value={account.accountHolderName}
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
              Rekening payout belum lengkap. Buka Settings untuk mengatur
              rekening pencairan organisasi.
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-2xl"
            onClick={() => router.push("/settings")}
          >
            Buka Settings
          </Button>
        </div>

        <div className="space-y-4 border-t border-zinc-100 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div>
            <CardTitle>Ringkasan aturan payout</CardTitle>
            <CardDescription className="mt-1.5">
              Pembayaran eligible adalah QRIS paid dari Duitku yang sudah
              diverifikasi dan masuk melalui payment gateway POSKART.
            </CardDescription>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm leading-6 text-zinc-600">
            Gateway fee adalah potongan Duitku dari setiap transaksi QRIS.
            Platform fee adalah biaya penarikan POSKART yang dikenakan satu kali
            saat invoice pencairan dibuat.
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
              label="Platform fee per pencairan"
              value={formatFeeSetting(
                summary.settings.platformFeeType,
                summary.settings.platformFeePercentage,
                summary.settings.platformFeeFixedAmount,
              )}
            />
            <PayoutRuleStat
              label="Minimal request"
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

function InvoiceAmountMetric({
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

function InvoiceDetailDialog({
  invoice,
  onClose,
}: {
  invoice: PayoutInvoice | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={Boolean(invoice)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={invoice ? invoice.invoiceNumber : "Detail invoice"}
      className="max-w-4xl"
    >
      {invoice ? (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 p-4">
              <div className="text-xs text-zinc-500">Rekening</div>
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
            <InvoiceAmountMetric
              label="Gross"
              value={formatPayoutCurrency(invoice.grossAmount)}
            />
            <InvoiceAmountMetric
              label="Fee Duitku"
              value={formatPayoutCurrency(invoice.gatewayFeeAmount)}
            />
            <InvoiceAmountMetric
              label="Biaya penarikan"
              value={formatPayoutCurrency(invoice.platformFeeAmount)}
            />
            <InvoiceAmountMetric
              label="Didapat"
              value={formatPayoutCurrency(invoice.netAmount)}
              strong
            />
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-900">
            Fee Duitku berasal dari setiap transaksi QRIS. Biaya penarikan
            POSKART dikenakan satu kali pada invoice pencairan ini.
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaksi</TableHead>
                <TableHead>Waktu</TableHead>
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
        </div>
      ) : null}
    </Dialog>
  );
}
