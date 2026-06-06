"use client";

import {
  Banknote,
  Check,
  Download,
  Printer,
  ReceiptText,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPosSale, deletePosSale } from "@/app/(admin)/pos/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { cn, formatCurrency } from "@/lib/utils";
import type { PosPackageCode, PosSale } from "@/types/pos";

const packages = [
  {
    code: "print_1" as const,
    name: "1 Print",
    description: "Satu hasil cetak untuk pelanggan",
    printCount: 1,
    amount: 6000,
  },
  {
    code: "print_2" as const,
    name: "2 Print",
    description: "Dua hasil cetak, lebih hemat",
    printCount: 2,
    amount: 10000,
    popular: true,
  },
  {
    code: "print_3" as const,
    name: "3 Print",
    description: "Tiga hasil cetak untuk grup",
    printCount: 3,
    amount: 14000,
  },
];

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getLocalDateKey(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function PosDashboard({ sales }: { sales: PosSale[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedPackage, setSelectedPackage] =
    useState<PosPackageCode>("print_1");
  const [search, setSearch] = useState("");
  const [packageFilter, setPackageFilter] = useState("all");
  const [dateMode, setDateMode] = useState<"all" | "date">("all");
  const [selectedDate, setSelectedDate] = useState(
    () => getLocalDateKey(new Date().toISOString()),
  );

  const filteredSales = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return sales.filter((sale) => {
      const matchesSearch =
        !normalizedSearch ||
        sale.id.toLowerCase().includes(normalizedSearch) ||
        sale.notes?.toLowerCase().includes(normalizedSearch);
      const matchesPackage =
        packageFilter === "all" || sale.packageCode === packageFilter;
      const matchesDate =
        dateMode === "all" || getLocalDateKey(sale.createdAt) === selectedDate;

      return matchesSearch && matchesPackage && matchesDate;
    });
  }, [dateMode, packageFilter, sales, search, selectedDate]);

  const metrics = useMemo(
    () => ({
      revenue: filteredSales.reduce((total, sale) => total + sale.amount, 0),
      prints: filteredSales.reduce((total, sale) => total + sale.printCount, 0),
      transactions: filteredSales.length,
    }),
    [filteredSales],
  );

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createPosSale(formData);
      if (!result.success) {
        toast.error(result.error ?? "Transaksi gagal disimpan.");
        return;
      }

      toast.success("Transaksi POS berhasil disimpan.");
      formRef.current?.reset();
      setSelectedPackage("print_1");
      router.refresh();
    });
  }

  function exportCsv() {
    if (filteredSales.length === 0) {
      toast.error("Belum ada data untuk diekspor.");
      return;
    }

    const rows = [
      ["ID", "Tanggal", "Paket", "Jumlah Print", "Pendapatan", "Pembayaran", "Catatan"],
      ...filteredSales.map((sale) => [
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
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `laporan-pos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleDelete(sale: PosSale) {
    if (!confirm(`Hapus transaksi ${sale.id.slice(0, 8).toUpperCase()}? Data tidak dapat dikembalikan.`)) {
      return;
    }

    startTransition(async () => {
      const result = await deletePosSale(sale.id);
      if (!result.success) {
        toast.error(result.error ?? "Transaksi gagal dihapus.");
        return;
      }

      toast.success("Transaksi berhasil dihapus.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
            <ReceiptText className="size-3.5" />
            Point of Sale
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Kasir Foto & Print</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Pilih paket print dan pantau hasil penjualan dalam satu halaman.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select
            value={dateMode}
            onChange={(event) => setDateMode(event.target.value as "all" | "date")}
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
              onChange={(event) => setSelectedDate(event.target.value)}
              className="sm:w-40"
              aria-label="Tanggal dashboard"
            />
          ) : null}
          <Button variant="outline" onClick={exportCsv}>
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
        <MetricCard
          title="Total pendapatan"
          value={formatCurrency(metrics.revenue)}
          description={`${filteredSales.length} transaksi tercatat`}
          icon={Banknote}
        />
        <MetricCard
          title="Jumlah print"
          value={metrics.prints.toLocaleString("id-ID")}
          description="Total lembar yang dipesan"
          icon={Printer}
        />
        <MetricCard
          title="Total transaksi"
          value={metrics.transactions.toLocaleString("id-ID")}
          description={dateMode === "all" ? "Semua transaksi tercatat" : "Transaksi pada tanggal terpilih"}
          icon={ReceiptText}
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
                          Favorit
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
                          {active ? <Check className="size-4" /> : item.printCount}
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

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="paymentMethod" className="text-sm font-medium">
                    Metode pembayaran
                  </label>
                  <Select id="paymentMethod" name="paymentMethod" defaultValue="Cash">
                    <option value="Cash">Cash</option>
                    <option value="QRIS">QRIS</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="notes" className="text-sm font-medium">
                    Catatan <span className="font-normal text-zinc-400">(opsional)</span>
                  </label>
                  <Input
                    id="notes"
                    name="notes"
                    placeholder="Contoh: Cetak ulang satu lembar"
                    maxLength={500}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full md:w-auto" size="lg" disabled={isPending}>
                <ReceiptText className="size-4" />
                {isPending ? "Menyimpan transaksi..." : "Simpan transaksi"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle>Riwayat penjualan</CardTitle>
                <CardDescription className="mt-1">
                  Data terbaru ditampilkan paling atas.
                </CardDescription>
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px]">
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
                  onChange={(event) => setPackageFilter(event.target.value)}
                >
                  <option value="all">Semua paket</option>
                  <option value="print_1">1 Print</option>
                  <option value="print_2">2 Print</option>
                  <option value="print_3">3 Print</option>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredSales.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu</TableHead>
                      <TableHead>Paket</TableHead>
                      <TableHead>Catatan</TableHead>
                      <TableHead>Bayar</TableHead>
                      <TableHead className="text-right">Pendapatan</TableHead>
                      <TableHead className="w-16 text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => (
                      <TableRow key={sale.id}>
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
                          <Badge variant={sale.paymentMethod === "QRIS" ? "success" : "secondary"}>
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
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 p-8 text-center">
                <div>
                  <div className="mx-auto grid size-11 place-items-center rounded-full bg-white shadow-sm">
                    <ReceiptText className="size-5 text-zinc-400" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">Belum ada transaksi</h3>
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

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof Banknote;
}) {
  return (
    <Card className="min-w-[78vw] snap-start sm:min-w-[280px] md:min-w-0">
      <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-1 md:p-5 md:pb-2">
        <CardTitle className="text-xs font-medium text-zinc-500">{title}</CardTitle>
        <div className="grid size-8 place-items-center rounded-lg bg-zinc-100">
          <Icon className="size-4 text-zinc-600" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 md:p-5 md:pt-0">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <p className="mt-1 text-xs text-zinc-500">{description}</p>
      </CardContent>
    </Card>
  );
}
