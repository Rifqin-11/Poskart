"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeDollarSign, Clock3, Download, Landmark, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/features/admin/_components/page-header";
import { StatCard } from "@/features/admin/_components/stat-card";
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
    notes: "",
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

  const submitRequest = () => {
    if (!summary.payoutAccount) {
      toast.error("Lengkapi rekening payout terlebih dahulu.");
      return;
    }

    startTransition(async () => {
      const result = await requestPayout({
        amount: requestForm.amount,
        accountId: summary.payoutAccount!.id,
        notes: requestForm.notes,
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
                notes: "",
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

      <PayoutSettingsSummary
        summary={summary}
        canRequest={canRequest}
        hasAccount={hasAccount}
      />

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
            Saldo tersedia:{" "}
            <span className="font-semibold text-zinc-950">
              {formatPayoutCurrency(summary.availableNetAmount)}
            </span>
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
          <label className="block text-xs font-medium text-zinc-600">
            Catatan
            <Textarea
              className="mt-1.5"
              value={requestForm.notes}
              placeholder="Opsional"
              onChange={(event) =>
                setRequestForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </label>
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
  canRequest,
  hasAccount,
}: {
  summary: PayoutSummary;
  canRequest: boolean;
  hasAccount: boolean;
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
          <div className="grid gap-3 md:grid-cols-3">
            <PayoutRuleStat
              label="Gateway fee fallback"
              value={`${summary.settings.gatewayFeePercentage}%`}
            />
            <PayoutRuleStat
              label="Platform fee POSKART"
              value={`${summary.settings.platformFeePercentage}%`}
            />
            <PayoutRuleStat
              label="Minimum payout"
              value={formatPayoutCurrency(summary.settings.minimumPayoutAmount)}
            />
          </div>
          {!canRequest ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {!hasAccount
                ? "Lengkapi rekening payout sebelum request pencairan."
                : "Saldo tersedia belum memenuhi minimum payout atau belum ada pembayaran eligible."}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
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
