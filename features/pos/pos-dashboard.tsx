"use client";

import {
  Banknote,
  Check,
  Download,
  Edit2,
  Printer,
  ReceiptText,
  Search,
  Trash2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createPosSale,
  deletePosSale,
  deletePosSales,
  getPosSalesExportAction,
  updatePosSale,
} from "@/app/(admin)/pos/actions";
import { StatCard } from "@/features/admin/_components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  csvCell,
  formatDate,
  getLocalDateKey,
} from "@/features/pos/pos-dashboard.utils";
import { EditPosSaleDialog } from "@/features/pos/components/edit-pos-sale-dialog";
import { adminQueryKeys } from "@/features/admin/query-keys";
import {
  DEFAULT_POS_SALE_FILTERS,
  POS_SALE_PAGE_SIZE,
} from "@/features/pos/pos-list-defaults";
import { usePosSales } from "@/features/pos/use-pos-sales";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  PosPackageCode,
  PosPackageOption,
  PosPaymentMethod,
  PosSale,
  PosSaleFilters,
} from "@/types/pos";

export function PosDashboard({
  packages,
}: {
  packages: PosPackageOption[];
}) {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const confirmDelete = useConfirmDialog();
  const [selectedPackage, setSelectedPackage] = useState<PosPackageCode>(
    packages[0]?.code ?? "",
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [packageFilter, setPackageFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | PosPaymentMethod>(
    "all",
  );
  const [dateMode, setDateMode] = useState<"all" | "date">("all");
  const [selectedDate, setSelectedDate] = useState(() =>
    getLocalDateKey(new Date().toISOString()),
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingSale, setEditingSale] = useState<PosSale | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = POS_SALE_PAGE_SIZE;
  const hasPackages = packages.length > 0;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
      setSelectedIds([]);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const filters = useMemo<PosSaleFilters>(
    () => ({
      ...DEFAULT_POS_SALE_FILTERS,
      page,
      pageSize,
      search: debouncedSearch,
      packageCode: packageFilter,
      paymentMethod: paymentFilter,
      date: dateMode === "date" ? selectedDate : "",
    }),
    [
      dateMode,
      debouncedSearch,
      packageFilter,
      page,
      pageSize,
      paymentFilter,
      selectedDate,
    ],
  );
  const { data: salesPage, isFetching } = usePosSales(filters);
  const sales = salesPage?.sales ?? [];
  const metrics = salesPage?.summary ?? {
    revenue: 0,
    prints: 0,
    transactions: 0,
  };
  const totalSales = salesPage?.total ?? 0;
  const activePage = Math.min(
    page,
    Math.max(1, Math.ceil(totalSales / pageSize)),
  );

  async function refreshPosData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.posSalesRoot }),
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard }),
    ]);
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createPosSale(formData);
      if (!result.success) {
        toast.error(result.error ?? "Transaksi gagal disimpan.");
        return;
      }

      toast.success("Transaksi POS berhasil disimpan.");
      formRef.current?.reset();
      setSelectedPackage(packages[0]?.code ?? "");
      setPage(1);
      await refreshPosData();
    });
  }

  function exportCsv() {
    if (totalSales === 0) {
      toast.error("Belum ada data untuk diekspor.");
      return;
    }

    startTransition(async () => {
      try {
        const exportSales = await getPosSalesExportAction(filters);
        const rows = [
          [
            "ID",
            "Tanggal",
            "Paket",
            "Jumlah Print",
            "Pendapatan",
            "Pembayaran",
            "Catatan",
          ],
          ...exportSales.map((sale) => [
            sale.id,
            formatDate(sale.createdAt),
            sale.packageName,
            sale.printCount,
            sale.amount,
            sale.paymentMethod,
            sale.notes ?? "",
          ]),
        ];
        const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
        const blob = new Blob(["\uFEFF", csv], {
          type: "text/csv;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `laporan-pos-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Laporan gagal diekspor.",
        );
      }
    });
  }

  function handleDelete(sale: PosSale) {
    confirmDelete.confirm({
      title: "Hapus transaksi?",
      description: `Hapus transaksi ${sale.id.slice(0, 8).toUpperCase()}? Data tidak dapat dikembalikan.`,
      confirmLabel: "Hapus",
      destructive: true,
      onConfirm: () => {
        startTransition(async () => {
          const result = await deletePosSale(sale.id);
          if (!result.success) {
            toast.error(result.error ?? "Transaksi gagal dihapus.");
            return;
          }

          toast.success("Transaksi berhasil dihapus.");
          setSelectedIds((prev) => prev.filter((id) => id !== sale.id));
          await refreshPosData();
        });
      },
    });
  }

  function handleDeleteSelected() {
    confirmDelete.confirm({
      title: "Hapus transaksi terpilih?",
      description: `Apakah Anda yakin ingin menghapus ${selectedIds.length} transaksi POS yang dipilih? Data tidak dapat dikembalikan.`,
      confirmLabel: "Hapus Semua",
      destructive: true,
      onConfirm: () => {
        startTransition(async () => {
          const result = await deletePosSales(selectedIds);
          if (!result.success) {
            toast.error(result.error ?? "Transaksi gagal dihapus.");
            return;
          }

          toast.success("Transaksi berhasil dihapus.");
          setSelectedIds([]);
          await refreshPosData();
        });
      },
    });
  }

  return (
    <div className="space-y-6">
      {confirmDelete.dialog}
      {editingSale ? (
        <EditPosSaleDialog
          sale={editingSale}
          packages={packages}
          pending={isPending}
          onClose={() => setEditingSale(null)}
          onSubmit={(values) => {
            startTransition(async () => {
              const result = await updatePosSale(values);
              if (!result.success) {
                toast.error(result.error ?? "Transaksi gagal diubah.");
                return;
              }
              toast.success("Transaksi POS berhasil diubah.");
              setEditingSale(null);
              await refreshPosData();
            });
          }}
        />
      ) : null}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Kasir Foto & Print
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Pilih paket print dan pantau hasil penjualan dalam satu halaman.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select
            value={dateMode}
            onChange={(event) => {
              setDateMode(event.target.value as "all" | "date");
              setPage(1);
              setSelectedIds([]);
            }}
            className="sm:w-40"
            aria-label="Filter periode dashboard"
          >
            <option value="all">Semua data</option>
            <option value="date">Pilih tanggal</option>
          </Select>
          {dateMode === "date" ? (
            <Input
              type="date"
              value={selectedDate}
              onChange={(event) => {
                setSelectedDate(event.target.value);
                setPage(1);
                setSelectedIds([]);
              }}
              className="sm:w-40"
              aria-label="Tanggal dashboard"
            />
          ) : null}
          <Button variant="outline" onClick={exportCsv} className="rounded-full">
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
        <StatCard
          title="Total pendapatan"
          value={formatCurrency(metrics.revenue)}
          description={`${metrics.transactions.toLocaleString("id-ID")} transaksi tercatat`}
          icon={Banknote}
          className="min-w-[78vw] snap-start sm:min-w-[280px] md:min-w-0"
        />
        <StatCard
          title="Jumlah print"
          value={metrics.prints.toLocaleString("id-ID")}
          description="Total lembar yang dipesan"
          icon={Printer}
          className="min-w-[78vw] snap-start sm:min-w-[280px] md:min-w-0"
        />
        <StatCard
          title="Total transaksi"
          value={metrics.transactions.toLocaleString("id-ID")}
          description={
            dateMode === "all"
              ? "Semua transaksi tercatat"
              : "Transaksi pada tanggal terpilih"
          }
          icon={ReceiptText}
          className="min-w-[78vw] snap-start sm:min-w-[280px] md:min-w-0"
        />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Transaksi baru</CardTitle>
            <CardDescription>
              Pilih paket print dan metode pembayaran.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form ref={formRef} action={handleSubmit} className="space-y-5">
              <input type="hidden" name="packageCode" value={selectedPackage} />

              {hasPackages ? (
                <div className="grid gap-3 md:grid-cols-3">
                  {packages.map((item) => {
                    const active = selectedPackage === item.code;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => setSelectedPackage(item.code)}
                        className={cn(
                          "relative rounded-xl border p-4 text-left transition-all",
                          active
                            ? "border-zinc-950 bg-zinc-950 text-white shadow-md"
                            : "border-zinc-200 bg-white hover:border-zinc-400 hover:bg-zinc-50",
                        )}
                      >
                        {item.popular ? (
                          <span
                            className={cn(
                              "absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              active
                                ? "bg-white/15 text-white"
                                : "bg-red-50 text-red-700",
                            )}
                          >
                            Promo
                          </span>
                        ) : null}
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "grid size-7 place-items-center rounded-full border",
                              active
                                ? "border-white/30 bg-white/10"
                                : "border-zinc-200 bg-zinc-50",
                            )}
                          >
                            {active ? (
                              <Check className="size-4" />
                            ) : (
                              item.printCount
                            )}
                          </div>
                          <div className="font-semibold">{item.name}</div>
                        </div>
                        <div
                          className={cn(
                            "mt-4 text-xl font-semibold",
                            active ? "text-white" : "text-zinc-950",
                          )}
                        >
                          {formatCurrency(item.amount)}
                        </div>
                        <p
                          className={cn(
                            "mt-1 text-xs leading-5",
                            active ? "text-zinc-300" : "text-zinc-500",
                          )}
                        >
                          {item.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                  Belum ada paket aktif. Tambahkan atau aktifkan paket dari
                  halaman Pricing.
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="paymentMethod"
                    className="text-sm font-medium"
                  >
                    Metode pembayaran
                  </label>
                  <Select
                    id="paymentMethod"
                    name="paymentMethod"
                    defaultValue="Cash"
                  >
                    <option value="Cash">Cash</option>
                    <option value="QRIS">QRIS</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="notes" className="text-sm font-medium">
                    Catatan{" "}
                    <span className="font-normal text-zinc-400">
                      (opsional)
                    </span>
                  </label>
                  <Input
                    id="notes"
                    name="notes"
                    placeholder="Contoh: Cetak ulang satu lembar"
                    maxLength={500}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full md:w-auto"
                size="lg"
                disabled={isPending || !hasPackages}
              >
                <ReceiptText className="size-4" />
                {isPending ? "Menyimpan transaksi..." : "Simpan transaksi"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-center justify-between lg:justify-start gap-4">
                <div>
                  <CardTitle>Riwayat penjualan</CardTitle>
                  <CardDescription className="mt-1">
                    Data terbaru ditampilkan paling atas.
                  </CardDescription>
                </div>
                {selectedIds.length > 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDeleteSelected}
                    className="flex items-center gap-1.5 animate-in fade-in duration-200"
                    disabled={isPending}
                  >
                    <Trash2 className="size-3.5" /> Hapus Terpilih (
                    {selectedIds.length})
                  </Button>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_150px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari ID atau catatan"
                    className="pl-9"
                  />
                </div>
                <Select
                  value={packageFilter}
                  onChange={(event) => {
                    setPackageFilter(event.target.value);
                    setPage(1);
                    setSelectedIds([]);
                  }}
                  aria-label="Filter paket"
                >
                  <option value="all">Semua paket</option>
                  {packages.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </Select>
                <Select
                  value={paymentFilter}
                  onChange={(event) => {
                    setPaymentFilter(
                      event.target.value as "all" | PosPaymentMethod,
                    );
                    setPage(1);
                    setSelectedIds([]);
                  }}
                  aria-label="Filter metode pembayaran"
                >
                  <option value="all">Semua bayar</option>
                  <option value="Cash">Cash</option>
                  <option value="QRIS">QRIS</option>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {sales.length > 0 ? (
              <div
                className={cn(
                  "overflow-x-auto transition-opacity",
                  isFetching && "opacity-60",
                )}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          className="size-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 accent-zinc-950 cursor-pointer"
                          checked={
                            sales.length > 0 &&
                            sales.every((t) =>
                              selectedIds.includes(t.id),
                            )
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) => {
                                const newIds = [...prev];
                                sales.forEach((t) => {
                                  if (!newIds.includes(t.id)) newIds.push(t.id);
                                });
                                return newIds;
                              });
                            } else {
                              setSelectedIds((prev) =>
                                prev.filter(
                                  (id) =>
                                    !sales.some((t) => t.id === id),
                                ),
                              );
                            }
                          }}
                          aria-label="Pilih semua transaksi POS"
                        />
                      </TableHead>
                      <TableHead>Waktu</TableHead>
                      <TableHead>Paket</TableHead>
                      <TableHead>Catatan</TableHead>
                      <TableHead>Bayar</TableHead>
                      <TableHead className="text-right">Pendapatan</TableHead>
                      <TableHead className="w-24 text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => (
                      <TableRow
                        key={sale.id}
                        className={
                          selectedIds.includes(sale.id) ? "bg-zinc-50/60" : ""
                        }
                      >
                        <TableCell className="w-12">
                          <input
                            type="checkbox"
                            className="size-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 accent-zinc-950 cursor-pointer"
                            checked={selectedIds.includes(sale.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds((prev) => [...prev, sale.id]);
                              } else {
                                setSelectedIds((prev) =>
                                  prev.filter((id) => id !== sale.id),
                                );
                              }
                            }}
                            aria-label={`Pilih transaksi POS ${sale.id.slice(0, 8)}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="whitespace-nowrap text-sm">
                            {formatDate(sale.createdAt)}
                          </div>
                          <div className="mt-1 font-mono text-[10px] text-zinc-400">
                            {sale.id.slice(0, 8).toUpperCase()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>{sale.packageName}</div>
                          <div className="text-xs text-zinc-500">
                            {sale.printCount} lembar
                          </div>
                        </TableCell>
                        <TableCell className="max-w-72 truncate text-zinc-500">
                          {sale.notes || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              sale.paymentMethod === "QRIS"
                                ? "success"
                                : "secondary"
                            }
                          >
                            {sale.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(sale.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-zinc-400 hover:bg-zinc-100 hover:text-zinc-950"
                            onClick={() => setEditingSale(sale)}
                            disabled={isPending}
                            aria-label={`Edit transaksi ${sale.id.slice(0, 8)}`}
                          >
                            <Edit2 className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-zinc-400 hover:bg-red-50 hover:text-red-600"
                            onClick={() => handleDelete(sale)}
                            disabled={isPending}
                            aria-label={`Hapus transaksi ${sale.id.slice(0, 8)}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  page={activePage}
                  pageSize={pageSize}
                  totalItems={totalSales}
                  onPageChange={(nextPage) => {
                    setPage(nextPage);
                    setSelectedIds([]);
                  }}
                />
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 p-8 text-center">
                <div>
                  <div className="mx-auto grid size-11 place-items-center rounded-full bg-white shadow-sm">
                    <ReceiptText className="size-5 text-zinc-400" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">
                    Belum ada transaksi
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    Transaksi yang disimpan akan muncul di sini.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
