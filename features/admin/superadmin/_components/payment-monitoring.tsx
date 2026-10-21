"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { getPaymentMonitoring } from "@/server/admin/actions/payment-monitoring-actions";
import type { Organization } from "@/types/organization";
import type { MonitoredPayment, PaymentMonitorFilters } from "@/types/payment-monitoring";

const initialFilters: PaymentMonitorFilters = { page: 1, organizationId: "", status: "", search: "", from: "", to: "" };
const date = (value: string | null) => value ? formatDateTime(value) : "—";

export function PaymentMonitoring({ organizations }: { organizations: Organization[] }) {
  const [draft, setDraft] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [selected, setSelected] = useState<MonitoredPayment | null>(null);
  const query = useQuery({
    queryKey: ["superadmin", "payment-monitoring", filters],
    queryFn: () => getPaymentMonitoring(filters),
    retry: false,
  });
  const rows = query.data?.items ?? [];
  const orgName = (id: string) => organizations.find(o => o.id === id)?.name ?? id;

  function exportPage() {
    // Guard CSV formula injection, including organization names controlled by tenants.
    const cell = (value: unknown) => `"${String(value ?? "").replace(/^[\s]*[=+@-]/, "'$&").replaceAll('"', '""')}"`;
    const content = [
      ["Organization", "Transaction", "Order", "Reference", "Collection", "Status", "Gross", "Fee", "Net", "Ledger", "Estimated settlement", "Created", "Paid", "Warnings"],
      ...rows.map(r => [orgName(r.organizationId), r.id, r.orderId, r.reference, r.collectionMode, r.status, r.amount,
        r.ledger?.fee, r.ledger?.net, r.ledger?.id, r.ledger?.settlement, r.createdAt, r.paidAt, r.warnings.join("; ")]),
    ].map(row => row.map(cell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = `payment-monitoring-page-${filters.page}.csv`; link.click();
    URL.revokeObjectURL(url);
  }

  return <Card>
    <CardHeader>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Payment Monitoring</CardTitle>
          <CardDescription>Pembayaran QRIS Duitku lintas organisasi. Read-only; tidak mengubah saldo atau status pembayaran.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw className="size-4" />Muat ulang</Button>
          <Button variant="outline" disabled={!rows.length || query.isFetching || query.isError} onClick={exportPage}><Download className="size-4" />CSV halaman ini</Button>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" onSubmit={event => { event.preventDefault(); setFilters({ ...draft, page: 1 }); }}>
        <label className="space-y-1 text-xs text-zinc-500">Organisasi
          <Select value={draft.organizationId} onChange={e => setDraft({ ...draft, organizationId: e.target.value })}>
            <option value="">Semua organisasi</option>{organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
        </label>
        <label className="space-y-1 text-xs text-zinc-500">Status lokal
          <Select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })}>
            <option value="">Semua status</option>{["pending", "paid", "failed", "cancelled", "expired", "refunded"].map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </label>
        <label className="space-y-1 text-xs text-zinc-500">ID transaksi / order / referensi
          <Input value={draft.search} maxLength={100} placeholder="Cari ID pembayaran" onChange={e => setDraft({ ...draft, search: e.target.value })} />
        </label>
        <label className="space-y-1 text-xs text-zinc-500">Dibuat sejak (WIB)<Input type="date" value={draft.from} onChange={e => setDraft({ ...draft, from: e.target.value })} /></label>
        <label className="space-y-1 text-xs text-zinc-500">Dibuat sampai (WIB)<Input type="date" value={draft.to} onChange={e => setDraft({ ...draft, to: e.target.value })} /></label>
        <div className="flex items-end gap-2"><Button type="submit" disabled={query.isFetching}>Terapkan filter</Button><Button type="button" variant="ghost" onClick={() => { setDraft(initialFilters); setFilters(initialFilters); }}>Reset</Button></div>
      </form>
      <p className="rounded-xl bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600">
        Status gateway adalah hasil pemeriksaan terakhir yang tersimpan, bukan cek live. Settlement di bawah bersifat estimasi, bukan konfirmasi dana masuk bank.
        Penanda hanya menunjukkan ketidaksesuaian lokal; tidak adanya penanda bukan jaminan rekonsiliasi selesai. Callback tanpa transaksi belum termasuk tabel ini.
      </p>
      {query.isError ? <div role="alert" className="rounded-xl border border-red-200 p-4 text-sm text-red-700">{query.error instanceof Error ? query.error.message : "Data gagal dimuat."} Gunakan Muat ulang untuk mencoba lagi.</div> : null}
      <div className="overflow-x-auto" aria-busy={query.isFetching}>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Pembayaran</TableHead><TableHead>Organisasi</TableHead><TableHead>Bruto / fee / net</TableHead>
            <TableHead>Lokal / gateway</TableHead><TableHead>Ledger / settlement</TableHead><TableHead>Penanda</TableHead><TableHead>Detail</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {query.isLoading ? <TableRow><TableCell colSpan={7}><div className="animate-pulse py-8 text-center text-zinc-500" role="status">Memuat pembayaran…</div></TableCell></TableRow> : null}
            {!query.isLoading && !query.isError && !rows.length ? <TableRow><TableCell colSpan={7} className="py-10 text-center text-zinc-500">Tidak ada pembayaran yang cocok dengan filter.</TableCell></TableRow> : null}
            {!query.isError && rows.map(r => <TableRow key={r.id}>
              <TableCell><p className="font-mono text-xs">{r.id}</p><p className="mt-1 font-mono text-xs text-zinc-500">{r.orderId}</p><p className="mt-1 text-xs text-zinc-500">{date(r.createdAt)}</p></TableCell>
              <TableCell><p>{orgName(r.organizationId)}</p><p className="text-xs text-zinc-500">{r.collectionMode ?? "Tidak diketahui"}</p></TableCell>
              <TableCell className="tabular-nums"><p>{formatCurrency(r.amount)}</p><p className="text-xs text-zinc-500">Fee {r.ledger ? formatCurrency(r.ledger.fee) : "—"}</p><p className="text-xs text-zinc-500">Net {r.ledger ? formatCurrency(r.ledger.net) : "—"}</p></TableCell>
              <TableCell><Badge variant={r.status === "paid" ? "success" : "secondary"}>{r.status}</Badge><p className="mt-1 text-xs text-zinc-500">Kode PG: {r.gatewayCode ?? "Belum dicek"}</p></TableCell>
              <TableCell><p>{r.ledger?.status ?? (r.collectionMode === "custom" ? "Gateway organisasi" : "Belum ada ledger")}</p><p className="text-xs text-zinc-500">Estimasi: {r.ledger?.settlement ?? "—"}</p></TableCell>
              <TableCell className="max-w-56">{r.warnings.length ? r.warnings.map(w => <p key={w} className="text-xs text-amber-700">{w}</p>) : <span className="text-xs text-zinc-500">Tidak ada penanda lokal</span>}</TableCell>
              <TableCell><Button variant="ghost" size="sm" aria-label={`Detail pembayaran ${r.id}`} onClick={() => setSelected(r)}>Detail</Button></TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
      </div>
      {query.data && !query.isError ? <TablePagination page={filters.page} pageSize={query.data.pageSize} totalItems={query.data.total} isLoading={query.isFetching} onPageChange={page => setFilters({ ...filters, page })} /> : null}
    </CardContent>
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }} title="Detail pembayaran">
      {selected ? <div className="space-y-5">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          {[
            ["Organisasi", orgName(selected.organizationId)], ["Transaksi", selected.id], ["Order", selected.orderId], ["Referensi Duitku", selected.reference],
            ["Dibuat", date(selected.createdAt)], ["Dibayar", date(selected.paidAt)], ["PG terakhir diperiksa", date(selected.checkedAt)],
            ["ID ledger", selected.ledger?.id], ["Penanda ledger", selected.ledger?.hold], ["Tanggal settlement (estimasi)", selected.ledger?.settlementDate],
          ].map(([label, value]) => <div key={label}><dt className="text-xs text-zinc-500">{label}</dt><dd className="mt-1 break-all">{value || "—"}</dd></div>)}
        </dl>
        <section className="space-y-2"><h3 className="text-sm font-semibold">Alokasi Payout / Withdraw</h3>
          <p className="text-xs text-zinc-500">Invoice rejected/canceled tidak mereservasi dana. Nominal di bawah adalah alokasi bruto, bukan jumlah transfer.</p>
          {!selected.allocations.length ? <p className="text-sm text-zinc-500">Belum ada alokasi berbasis item ledger.</p> : selected.allocations.map((a, i) => <div key={`${a.invoiceId}-${i}`} className="flex flex-wrap justify-between gap-2 border-b border-zinc-100 py-2 text-sm"><span>{a.invoiceNumber} · {a.status}</span><span className="tabular-nums">{formatCurrency(a.gross)}</span></div>)}
        </section>
        <p className="text-xs text-zinc-500">Snapshot saat tabel dimuat. Tutup detail lalu muat ulang untuk data terbaru.</p>
      </div> : null}
    </Dialog>
  </Card>;
}
