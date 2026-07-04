"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  CheckCircle2,
  Copy,
  Eye,
  Filter,
  ImageIcon,
  Save,
  Send,
  Upload,
  XCircle,
} from "lucide-react";
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

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
          <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
            <Input
              className="min-w-0"
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
              className="shrink-0"
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

        <div className="hidden overflow-x-auto xl:block">
          <Table className="min-w-[980px]">
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
                  <TableCell>
                    {invoice.organizationName ?? invoice.organizationId}
                  </TableCell>
                  <TableCell>
                    <PayoutStatusBadge invoice={invoice} />
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
                    {loading
                      ? "Memuat payout invoice..."
                      : "Belum ada payout invoice."}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
        <div className="grid gap-3 xl:hidden">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-zinc-950">
                    {invoice.invoiceNumber}
                  </div>
                  <div className="mt-1 truncate text-xs text-zinc-500">
                    {invoice.organizationName ?? invoice.organizationId}
                  </div>
                </div>
                <PayoutStatusBadge invoice={invoice} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Metric
                  label="Gross"
                  value={formatPayoutCurrency(invoice.grossAmount)}
                />
                <Metric label="Net" value={formatPayoutCurrency(invoice.netAmount)} />
                <Metric label="Items" value={String(invoice.items.length)} />
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-zinc-500">
                  Requested {formatPayoutDate(invoice.requestedAt)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => setSelectedInvoice(invoice)}
                >
                  <Eye className="size-4" />
                  Detail
                </Button>
              </div>
            </div>
          ))}
          {invoices.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">
              {loading ? "Memuat payout invoice..." : "Belum ada payout invoice."}
            </div>
          ) : null}
        </div>
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
        settings.gatewayFeeType,
        settings.gatewayFeePercentage,
        settings.gatewayFeeFixedAmount,
        settings.platformFeeType,
        settings.platformFeePercentage,
        settings.platformFeeFixedAmount,
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
    gatewayFeeType: settings.gatewayFeeType,
    gatewayFeePercentage: settings.gatewayFeePercentage,
    gatewayFeeFixedAmount: settings.gatewayFeeFixedAmount,
    platformFeeType: settings.platformFeeType,
    platformFeePercentage: settings.platformFeePercentage,
    platformFeeFixedAmount: settings.platformFeeFixedAmount,
    minimumPayoutAmount: settings.minimumPayoutAmount,
  });

  const save = () => {
    startTransition(async () => {
      const nextSettings = {
        ...settings,
        gatewayFeeType: draft.gatewayFeeType,
        gatewayFeePercentage: draft.gatewayFeePercentage,
        gatewayFeeFixedAmount: draft.gatewayFeeFixedAmount,
        platformFeeType: draft.platformFeeType,
        platformFeePercentage: draft.platformFeePercentage,
        platformFeeFixedAmount: draft.platformFeeFixedAmount,
        minimumPayoutAmount: draft.minimumPayoutAmount,
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
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_minmax(0,260px)_minmax(0,260px)_minmax(0,180px)_auto] xl:items-end">
        <div className="min-w-0 lg:col-span-2 xl:col-span-1">
          <div className="text-sm font-semibold text-zinc-950">
            Global payout settings
          </div>
          <div className="mt-1 text-xs leading-5 text-zinc-500">
            Dipakai untuk menghitung saldo tersedia dan disnapshot saat invoice
            payout dibuat. Gateway fee dihitung per transaksi QRIS; platform
            fee dihitung satu kali per pencairan.
          </div>
        </div>
        <FeeSettingField
          label="Gateway fee"
          type={draft.gatewayFeeType}
          percentage={draft.gatewayFeePercentage}
          fixedAmount={draft.gatewayFeeFixedAmount}
          onTypeChange={(value) =>
            setDraft((current) => ({ ...current, gatewayFeeType: value }))
          }
          onPercentageChange={(value) =>
            setDraft((current) => ({
              ...current,
              gatewayFeePercentage: value,
            }))
          }
          onFixedAmountChange={(value) =>
            setDraft((current) => ({
              ...current,
              gatewayFeeFixedAmount: value,
            }))
          }
        />
        <FeeSettingField
          label="Platform fee"
          type={draft.platformFeeType}
          percentage={draft.platformFeePercentage}
          fixedAmount={draft.platformFeeFixedAmount}
          onTypeChange={(value) =>
            setDraft((current) => ({ ...current, platformFeeType: value }))
          }
          onPercentageChange={(value) =>
            setDraft((current) => ({
              ...current,
              platformFeePercentage: value,
            }))
          }
          onFixedAmountChange={(value) =>
            setDraft((current) => ({
              ...current,
              platformFeeFixedAmount: value,
            }))
          }
        />
        <label className="block min-w-0 text-xs font-medium text-zinc-600">
          Minimal request
          <Input
            className="mt-1.5 min-w-0 bg-white"
            type="number"
            min={0}
            value={draft.minimumPayoutAmount}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                minimumPayoutAmount: Number(event.target.value) || 0,
              }))
            }
          />
        </label>
        <Button className="w-full xl:w-auto" onClick={save} disabled={isPending}>
          <Save className="size-4" />
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

function FeeSettingField({
  label,
  type,
  percentage,
  fixedAmount,
  onTypeChange,
  onPercentageChange,
  onFixedAmountChange,
}: {
  label: string;
  type: "percentage" | "fixed";
  percentage: number;
  fixedAmount: number;
  onTypeChange: (value: "percentage" | "fixed") => void;
  onPercentageChange: (value: number) => void;
  onFixedAmountChange: (value: number) => void;
}) {
  const isFixed = type === "fixed";

  return (
    <div className="grid min-w-0 gap-1.5 text-xs font-medium text-zinc-600">
      <span>{label}</span>
      <div className="grid min-w-0 grid-cols-[82px_minmax(0,1fr)] gap-2 sm:grid-cols-[104px_minmax(0,1fr)]">
        <Select
          className="min-w-0 bg-white"
          value={type}
          onChange={(event) =>
            onTypeChange(event.target.value === "fixed" ? "fixed" : "percentage")
          }
        >
          <option value="percentage">%</option>
          <option value="fixed">Rp</option>
        </Select>
        <Input
          className="min-w-0 bg-white"
          type="number"
          min={0}
          max={isFixed ? undefined : 100}
          step={isFixed ? 1 : 0.01}
          value={isFixed ? fixedAmount : percentage}
          onChange={(event) => {
            const value = Number(event.target.value) || 0;
            if (isFixed) onFixedAmountChange(value);
            else onPercentageChange(value);
          }}
        />
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

function CopyInfoRow({ label, value }: { label: string; value: string }) {
  const canCopy = value && value !== "-";

  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="min-w-0 truncate font-medium text-zinc-950">{value}</div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={!canCopy}
        className="size-8"
        onClick={() => {
          if (!canCopy) return;
          void navigator.clipboard.writeText(value);
          toast.success(`${label} disalin`);
        }}
        title={`Copy ${label}`}
      >
        <Copy className="size-4" />
      </Button>
    </div>
  );
}

function PayoutStatusBadge({ invoice }: { invoice: PayoutInvoice }) {
  return (
    <Badge variant="outline" className={getPayoutStatusClassName(invoice.status)}>
      {getPayoutStatusLabel(invoice.status)}
    </Badge>
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
    paidAt: invoice?.paidAt ? invoice.paidAt.slice(0, 16) : "",
    paymentProofUrl: invoice.paymentProofUrl ?? "",
    paymentProofKey: invoice.paymentProofKey ?? "",
  });
  const [uploadingProof, setUploadingProof] = useState(false);
  const canMarkPaid =
    invoice.status !== "paid" &&
    Boolean(review.paymentReference.trim()) &&
    Boolean(review.paymentProofUrl) &&
    Boolean(review.paymentProofKey);

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

  async function uploadProof(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Bukti transfer harus JPG, PNG, atau WebP.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Ukuran bukti transfer maksimal 8 MB.");
      return;
    }

    setUploadingProof(true);
    try {
      const form = new FormData();
      form.set("invoiceId", invoice.id);
      form.set("file", file);
      const response = await fetch("/api/admin/payout-proof", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json().catch(() => null)) as {
        url?: string;
        key?: string;
        message?: string;
      } | null;
      if (!response.ok || !payload?.url || !payload?.key) {
        throw new Error(payload?.message ?? "Upload bukti transfer gagal.");
      }
      setReview((current) => ({
        ...current,
        paymentProofUrl: payload.url ?? "",
        paymentProofKey: payload.key ?? "",
      }));
      toast.success("Bukti transfer diupload dan dikompres.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload bukti transfer gagal.",
      );
    } finally {
      setUploadingProof(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-5">
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
      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-900">
        Gateway fee adalah potongan Duitku dari transaksi QRIS. Platform fee
        adalah biaya penarikan POSKART yang dikenakan satu kali pada invoice
        pencairan.
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-4">
          <div className="text-sm font-semibold text-zinc-950">
            Rekening tujuan
          </div>
          <div className="mt-3 space-y-2">
            <CopyInfoRow
              label="Bank"
              value={invoice.accountSnapshot.bankName ?? "-"}
            />
            <CopyInfoRow
              label="Nomor rekening"
              value={invoice.accountSnapshot.accountNumber ?? "-"}
            />
            <CopyInfoRow
              label="Nama pemilik"
              value={invoice.accountSnapshot.accountHolderName ?? "-"}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-zinc-950">
                Bukti transfer
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                JPG, PNG, atau WebP. Maksimal 8 MB, otomatis dikompres ke WebP.
              </div>
            </div>
            <ImageIcon className="size-5 text-zinc-400" />
          </div>
          {review.paymentProofUrl ? (
            <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={review.paymentProofUrl}
                alt="Bukti transfer"
                className="max-h-52 w-full object-contain"
              />
            </div>
          ) : (
            <div className="mt-3 grid min-h-32 place-items-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 text-center text-sm text-zinc-500">
              Belum ada bukti transfer.
            </div>
          )}
          <label className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50">
            <Upload className="size-4" />
            {uploadingProof
              ? "Mengupload..."
              : review.paymentProofUrl
                ? "Ganti bukti"
                : "Upload bukti"}
            <input
              className="hidden"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploadingProof || isPending || invoice.status === "paid"}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void uploadProof(file);
              }}
            />
          </label>
        </div>
      </div>

      <div className="grid gap-3 rounded-3xl border border-zinc-200 bg-zinc-50 p-4 lg:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)]">
        <label className="block text-xs font-medium text-zinc-600">
          Tanggal transfer
          <Input
            className="mt-1.5 bg-white"
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
          Referensi transfer
          <Input
            className="mt-1.5 bg-white"
            placeholder="Nomor referensi / mutasi bank"
            value={review.paymentReference}
            onChange={(event) =>
              setReview((current) => ({
                ...current,
                paymentReference: event.target.value,
              }))
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Catatan review
          <Textarea
            className="mt-1.5 min-h-11 bg-white"
            value={review.reviewNotes}
            onChange={(event) =>
              setReview((current) => ({
                ...current,
                reviewNotes: event.target.value,
              }))
            }
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200">
        <Table className="min-w-[760px]">
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
      </div>

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
              () => rejectPayoutInvoice(invoice.id, review.rejectionReason),
              "Invoice rejected",
            )
          }
        >
          <XCircle className="size-4" />
          Reject
        </Button>
      </div>

      <div className="grid gap-2 border-t border-zinc-100 pt-4 sm:flex sm:flex-wrap sm:justify-end">
        {!canMarkPaid && invoice.status !== "paid" ? (
          <div className="self-center text-xs text-zinc-500 sm:mr-auto">
            Isi referensi transfer dan upload bukti sebelum menandai invoice paid.
          </div>
        ) : null}
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
          disabled={
            isPending ||
            uploadingProof ||
            invoice.status === "paid" ||
            !canMarkPaid
          }
          onClick={() =>
            runAction(
              () =>
                markPayoutInvoicePaid(
                  invoice.id,
                  review.paymentReference,
                  review.paidAt || undefined,
                  {
                    url: review.paymentProofUrl,
                    key: review.paymentProofKey,
                  },
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
