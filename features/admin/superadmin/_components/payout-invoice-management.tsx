"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CheckCircle2, Eye, Filter, Save, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  approvePayoutInvoice,
  getPayoutInvoicesForSuperadmin,
  getPayoutSettingsForSuperadmin,
  markPayoutInvoicePaid,
  rejectPayoutInvoice,
  savePayoutSettingsForSuperadmin,
} from "@/server/admin/actions/payout-actions";
import {
  formatPayoutCurrency,
  formatPayoutDate,
  getPayoutStatusClassName,
  getPayoutStatusLabel,
} from "@/features/admin/payout/payout-format";
import type { Organization } from "@/types/organization";
import type { PayoutInvoice, PayoutSettings, PayoutStatus } from "@/types/payout";

type Filters = {
  status: PayoutStatus | "all";
  organizationId: string;
  paymentGateway: string;
  dateFrom: string;
  dateTo: string;
};

const DEFAULT_FILTERS: Filters = {
  status: "all",
  organizationId: "",
  paymentGateway: "",
  dateFrom: "",
  dateTo: "",
};

export function PayoutInvoiceManagement({
  organizations,
}: {
  organizations: Organization[];
}) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [invoices, setInvoices] = useState<PayoutInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<PayoutInvoice | null>(
    null,
  );
  const [settings, setSettings] = useState<PayoutSettings | null>(null);

  const loadInvoices = async (nextFilters = filters) => {
    setLoading(true);
    try {
      const data = await getPayoutInvoicesForSuperadmin({
        status: nextFilters.status,
        organizationId: nextFilters.organizationId || undefined,
        paymentGateway: nextFilters.paymentGateway || undefined,
        dateFrom: nextFilters.dateFrom || undefined,
        dateTo: nextFilters.dateTo || undefined,
      });
      setInvoices(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat payout");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadInvoices(DEFAULT_FILTERS);
      void getPayoutSettingsForSuperadmin()
        .then(setSettings)
        .catch((error) =>
          toast.error(
            error instanceof Error ? error.message : "Gagal memuat payout setting",
          ),
        );
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(
    () =>
      invoices.reduce(
        (acc, invoice) => ({
          gross: acc.gross + invoice.grossAmount,
          net: acc.net + invoice.netAmount,
          pending:
            acc.pending +
            (["requested", "approved"].includes(invoice.status)
              ? invoice.netAmount
              : 0),
        }),
        { gross: 0, net: 0, pending: 0 },
      ),
    [invoices],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payout Invoices</CardTitle>
        <CardDescription>
          Review request pencairan organisasi dan tandai transfer manual sebagai
          paid.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {settings ? (
          <PayoutGlobalSettings
            settings={settings}
            onSaved={(nextSettings) => setSettings(nextSettings)}
          />
        ) : null}

        <div className="grid gap-3 lg:grid-cols-5">
          <Select
            value={filters.organizationId}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                organizationId: event.target.value,
              }))
            }
          >
            <option value="">Semua organisasi</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </Select>
          <Select
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value as Filters["status"],
              }))
            }
          >
            <option value="all">Semua status</option>
            <option value="requested">Requested</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="rejected">Rejected</option>
            <option value="canceled">Canceled</option>
          </Select>
          <Select
            value={filters.paymentGateway}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                paymentGateway: event.target.value,
              }))
            }
          >
            <option value="">Semua gateway</option>
            <option value="duitku">Duitku</option>
          </Select>
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                dateFrom: event.target.value,
              }))
            }
          />
          <div className="flex gap-2">
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  dateTo: event.target.value,
                }))
              }
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => void loadInvoices(filters)}
            >
              <Filter className="size-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Invoice" value={String(invoices.length)} />
          <Metric label="Pending payout" value={formatPayoutCurrency(totals.pending)} />
          <Metric label="Net total" value={formatPayoutCurrency(totals.net)} />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Gross</TableHead>
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
                <TableCell>{invoice.organizationName ?? invoice.organizationId}</TableCell>
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
                    <Eye className="size-4" />
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
                  {loading ? "Memuat payout invoice..." : "Belum ada payout invoice."}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>

      <PayoutReviewDialog
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onChanged={() => void loadInvoices(filters)}
      />
    </Card>
  );
}

function PayoutGlobalSettings({
  settings,
  onSaved,
}: {
  settings: PayoutSettings;
  onSaved: (settings: PayoutSettings) => void;
}) {
  return (
    <PayoutGlobalSettingsFields
      key={[
        settings.gatewayFeePercentage,
        settings.platformFeePercentage,
        settings.payoutAdjustmentAmount,
        settings.minimumPayoutAmount,
      ].join(":")}
      settings={settings}
      onSaved={onSaved}
    />
  );
}

function PayoutGlobalSettingsFields({
  settings,
  onSaved,
}: {
  settings: PayoutSettings;
  onSaved: (settings: PayoutSettings) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState({
    gatewayFeePercentage: settings.gatewayFeePercentage,
    platformFeePercentage: settings.platformFeePercentage,
    payoutAdjustmentAmount: settings.payoutAdjustmentAmount,
  });

  const save = () => {
    startTransition(async () => {
      const nextSettings = {
        ...settings,
        gatewayFeePercentage: draft.gatewayFeePercentage,
        platformFeePercentage: draft.platformFeePercentage,
        payoutAdjustmentAmount: draft.payoutAdjustmentAmount,
      };
      const result = await savePayoutSettingsForSuperadmin(nextSettings);
      if (!result.success) {
        toast.error(result.error ?? "Gagal menyimpan payout setting");
        return;
      }
      onSaved(nextSettings);
      toast.success("Payout setting tersimpan");
    });
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-56 flex-1">
          <div className="text-sm font-semibold text-zinc-950">
            Global payout settings
          </div>
          <div className="mt-1 text-xs leading-5 text-zinc-500">
            Dipakai saat invoice payout dibuat, sehingga review invoice tidak
            perlu input fee/adjustment berulang.
          </div>
        </div>
        <label className="block text-xs font-medium text-zinc-600">
          Gateway fee (%)
          <Input
            className="mt-1.5 bg-white"
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={draft.gatewayFeePercentage}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                gatewayFeePercentage: Number(event.target.value) || 0,
              }))
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Platform fee (%)
          <Input
            className="mt-1.5 bg-white"
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={draft.platformFeePercentage}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                platformFeePercentage: Number(event.target.value) || 0,
              }))
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Adjustment
          <Input
            className="mt-1.5 bg-white"
            type="number"
            value={draft.payoutAdjustmentAmount}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                payoutAdjustmentAmount: Number(event.target.value) || 0,
              }))
            }
          />
        </label>
        <Button onClick={save} disabled={isPending}>
          <Save className="size-4" />
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-zinc-950">{value}</div>
    </div>
  );
}

function PayoutReviewDialog({
  invoice,
  onClose,
  onChanged,
}: {
  invoice: PayoutInvoice | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  return (
    <Dialog
      open={Boolean(invoice)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={invoice ? `Review ${invoice.invoiceNumber}` : "Review payout"}
      className="max-w-5xl"
    >
      {invoice ? (
        <PayoutReviewContent
          key={invoice.id}
          invoice={invoice}
          onClose={onClose}
          onChanged={onChanged}
        />
      ) : null}
    </Dialog>
  );
}

function PayoutReviewContent({
  invoice,
  onClose,
  onChanged,
}: {
  invoice: PayoutInvoice;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [review, setReview] = useState({
    reviewNotes: invoice?.reviewNotes ?? "",
    rejectionReason: "",
    paymentReference: invoice?.paymentReference ?? "",
    paidAt: "",
  });

  const runAction = (
    action: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string,
  ) => {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error ?? "Action gagal");
        return;
      }
      toast.success(successMessage);
      onChanged();
      onClose();
    });
  };

  return (
    <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Gross" value={formatPayoutCurrency(invoice.grossAmount)} />
            <Metric
              label="Gateway fee"
              value={formatPayoutCurrency(invoice.gatewayFeeAmount)}
            />
            <Metric
              label="Platform fee"
              value={formatPayoutCurrency(invoice.platformFeeAmount)}
            />
            <Metric
              label="Adjustment"
              value={formatPayoutCurrency(invoice.adjustmentAmount)}
            />
            <Metric
              label="Approved net"
              value={formatPayoutCurrency(invoice.netAmount)}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-600">
              Paid at
              <Input
                className="mt-1.5"
                type="datetime-local"
                value={review.paidAt}
                onChange={(event) =>
                  setReview((current) => ({
                    ...current,
                    paidAt: event.target.value,
                  }))
                }
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Review notes
              <Textarea
                className="mt-1.5"
                value={review.reviewNotes}
                onChange={(event) =>
                  setReview((current) => ({
                    ...current,
                    reviewNotes: event.target.value,
                  }))
                }
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Payment reference / bukti transfer
              <Textarea
                className="mt-1.5"
                value={review.paymentReference}
                onChange={(event) =>
                  setReview((current) => ({
                    ...current,
                    paymentReference: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
            <div className="font-medium text-zinc-950">Rekening tujuan</div>
            <div className="mt-1 text-zinc-600">
              {invoice.accountSnapshot.bankName ?? "-"} ·{" "}
              {invoice.accountSnapshot.accountNumber ?? "-"} ·{" "}
              {invoice.accountSnapshot.accountHolderName ?? "-"}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaksi</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Booth</TableHead>
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

          <div className="grid gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 md:grid-cols-[minmax(0,1fr)_auto]">
            <Input
              placeholder="Alasan reject"
              value={review.rejectionReason}
              onChange={(event) =>
                setReview((current) => ({
                  ...current,
                  rejectionReason: event.target.value,
                }))
              }
            />
            <Button
              variant="outline"
              disabled={isPending || invoice.status === "paid"}
              onClick={() =>
                runAction(
                  () =>
                    rejectPayoutInvoice(invoice.id, review.rejectionReason),
                  "Invoice rejected",
                )
              }
            >
              <XCircle className="size-4" />
              Reject
            </Button>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4">
            <Button variant="outline" onClick={onClose}>
              Tutup
            </Button>
            <Button
              variant="outline"
              disabled={isPending || invoice.status === "paid"}
              onClick={() =>
                runAction(
                  () =>
                    approvePayoutInvoice(invoice.id, {
                      reviewNotes: review.reviewNotes,
                    }),
                  "Invoice approved",
                )
              }
            >
              <CheckCircle2 className="size-4" />
              Approve
            </Button>
            <Button
              disabled={isPending || invoice.status === "paid"}
              onClick={() =>
                runAction(
                  () =>
                    markPayoutInvoicePaid(
                      invoice.id,
                      review.paymentReference,
                      review.paidAt || undefined,
                    ),
                  "Invoice marked as paid",
                )
              }
            >
              <Send className="size-4" />
              Mark paid
            </Button>
          </div>
    </div>
  );
}
