"use client";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Edit2,
  FileDown,
  FileSpreadsheet,
  FileText,
  Plus,
  QrCode,
  Search,
  Settings2,
  Tags,
  Trash2,
  WalletCards,
} from "lucide-react";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createMoneyCategory,
  createMoneyTag,
  deleteMoneyCategory,
  deleteMoneyEntry,
  deleteMoneyTag,
  saveMoneyEntry,
} from "@/app/(admin)/money/actions";
import { StatCard } from "@/features/admin/_components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
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
  formatDate,
  formatMonthLabel,
  getCategoryLabel,
  getMonthKey,
  getNetAmount,
  walletLabels,
  type WalletFilter,
} from "@/features/money/money-dashboard.utils";
import {
  CategoryManagerDialog,
  MoneyEntryDialog,
  TagManagerDialog,
} from "@/features/money/components/money-dialogs";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  MoneyCustomCategory,
  MoneyEntry,
  MoneyEntryType,
  MoneyTag,
} from "@/types/money";

export function MoneyDashboard({
  entries,
  categories: customCategories,
  tags,
}: {
  entries: MoneyEntry[];
  categories: MoneyCustomCategory[];
  tags: MoneyTag[];
}) {
  const router = useRouter();
  const confirmDelete = useConfirmDialog();
  const [pending, startTransition] = useTransition();
  const [editorOpen, setEditorOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [editing, setEditing] = useState<MoneyEntry | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | MoneyEntryType>("all");
  const [walletFilter, setWalletFilter] = useState<WalletFilter>("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const monthOptions = useMemo(
    () =>
      Array.from(
        new Set([
          getMonthKey(new Date().toISOString()),
          ...entries.map((entry) => getMonthKey(entry.occurredAt)),
        ]),
      )
        .sort()
        .reverse(),
    [entries],
  );
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const scopedEntries = useMemo(() => {
    return entries.filter(
      (entry) =>
        (walletFilter === "all" || entry.walletType === walletFilter) &&
        (tagFilter === "all" ||
          entry.tags.some((tag) => tag.id === tagFilter)) &&
        (selectedMonth === "all" ||
          getMonthKey(entry.occurredAt) === selectedMonth),
    );
  }, [entries, selectedMonth, tagFilter, walletFilter]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return scopedEntries.filter(
      (entry) =>
        (typeFilter === "all" || entry.entryType === typeFilter) &&
        (!query ||
          entry.title.toLowerCase().includes(query) ||
          entry.notes?.toLowerCase().includes(query) ||
          getCategoryLabel(entry.category).toLowerCase().includes(query) ||
          entry.tags.some((tag) => tag.name.toLowerCase().includes(query))),
    );
  }, [scopedEntries, search, typeFilter]);

  const summary = useMemo(() => {
    const income = scopedEntries
      .filter((entry) => entry.entryType === "income")
      .reduce((total, entry) => total + getNetAmount(entry), 0);
    const expense = scopedEntries
      .filter((entry) => entry.entryType === "expense")
      .reduce((total, entry) => total + entry.amount, 0);
    return { income, expense, balance: income - expense };
  }, [scopedEntries]);
  const activePage = Math.min(
    page,
    Math.max(1, Math.ceil(filteredEntries.length / pageSize)),
  );
  const paginatedEntries = useMemo(
    () =>
      filteredEntries.slice((activePage - 1) * pageSize, activePage * pageSize),
    [activePage, filteredEntries],
  );

  const selectedWalletLabel =
    walletFilter === "all" ? "Keseluruhan" : walletLabels[walletFilter];
  const selectedMonthLabel =
    selectedMonth === "all" ? "Semua bulan" : formatMonthLabel(selectedMonth);

  const exportToExcel = useCallback(() => {
    const headers = [
      "Waktu",
      "Kategori",
      "Dompet",
      "Judul",
      "Keterangan",
      "Tag",
      "Nominal",
      "Potongan (%)",
      "Bersih",
    ];
    const rows = filteredEntries.map((entry) => [
      formatDate(entry.occurredAt),
      getCategoryLabel(entry.category),
      walletLabels[entry.walletType],
      entry.title,
      entry.notes || "",
      entry.tags.map((t) => t.name).join(", "),
      entry.amount,
      entry.feePercentage || 0,
      entry.entryType === "income" ? getNetAmount(entry) : entry.amount,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((val) => {
            const str = String(val).replace(/"/g, '""');
            return str.includes(",") || str.includes("\n") || str.includes('"')
              ? `"${str}"`
              : str;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `laporan_keuangan_${selectedMonth}_${Date.now()}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Laporan Excel (CSV) berhasil diekspor.");
  }, [filteredEntries, selectedMonth]);

  const exportToPDF = useCallback(() => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Gagal membuka jendela cetak. Pastikan pop-up diizinkan.");
      return;
    }

    const titleText = `Laporan Keuangan POSKART - ${selectedMonthLabel}`;
    const tableRows = filteredEntries
      .map(
        (entry) => `
      <tr>
        <td style="white-space: nowrap;">${formatDate(entry.occurredAt)}</td>
        <td>${getCategoryLabel(entry.category)}</td>
        <td><span style="display: inline-block; padding: 2px 6px; border: 1px solid #e4e4e7; border-radius: 4px; background: #fafafa; font-size: 10px;">${
          walletLabels[entry.walletType]
        }</span></td>
        <td>
          <div style="font-weight: 500;">${entry.title}</div>
          <div style="font-size: 10px; color: #71717a;">${
            entry.notes || "-"
          }</div>
        </td>
        <td>${entry.tags.map((t) => t.name).join(", ") || "-"}</td>
        <td style="text-align: right; font-weight: 600; color: ${
          entry.entryType === "income" ? "#047857" : "#b91c1c"
        }">
          ${entry.entryType === "income" ? "+" : "-"}${formatCurrency(
            entry.entryType === "income" ? getNetAmount(entry) : entry.amount,
          )}
        </td>
      </tr>
    `,
      )
      .join("");

    const content = `
      <html>
        <head>
          <title>${titleText}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #18181b;
              padding: 24px;
              font-size: 12px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #e4e4e7;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            .title {
              font-size: 20px;
              font-weight: 700;
              margin: 0;
            }
            .subtitle {
              color: #71717a;
              margin-top: 4px;
              font-size: 12px;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
              margin-bottom: 24px;
            }
            .summary-card {
              border: 1px solid #e4e4e7;
              border-radius: 8px;
              padding: 12px;
              background-color: #fafafa;
            }
            .summary-label {
              font-size: 10px;
              color: #71717a;
              text-transform: uppercase;
              font-weight: 600;
            }
            .summary-value {
              font-size: 16px;
              font-weight: 700;
              margin-top: 4px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 16px;
            }
            th {
              background-color: #f4f4f5;
              text-align: left;
              padding: 8px 12px;
              font-weight: 600;
              border-bottom: 1px solid #e4e4e7;
            }
            td {
              padding: 8px 12px;
              border-bottom: 1px solid #f4f4f5;
              vertical-align: top;
            }
            @media print {
              body { padding: 0; }
              @page { margin: 1.5cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">POSKART</h1>
              <div class="subtitle">Laporan Manajemen Keuangan Operasional</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 600;">Filter: ${selectedWalletLabel}</div>
              <div class="subtitle">Periode: ${selectedMonthLabel}</div>
            </div>
          </div>

          <div class="summary-grid">
            <div class="summary-card">
              <div class="summary-label">Arus Bersih / Saldo</div>
              <div class="summary-value" style="color: ${
                summary.balance < 0 ? "#b91c1c" : "#18181b"
              }">${formatCurrency(summary.balance)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Pemasukan</div>
              <div class="summary-value" style="color: #047857">${formatCurrency(
                summary.income,
              )}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Pengeluaran</div>
              <div class="summary-value" style="color: #b91c1c">${formatCurrency(
                summary.expense,
              )}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Kategori</th>
                <th>Dompet</th>
                <th>Catatan</th>
                <th>Tag</th>
                <th style="text-align: right;">Nominal</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div style="margin-top: 40px; text-align: right; color: #a1a1aa; font-size: 10px;">
            Dicetak secara otomatis pada ${new Date().toLocaleString("id-ID")}
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  }, [filteredEntries, selectedMonthLabel, selectedWalletLabel, summary]);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const handleDelete = (entry: MoneyEntry) => {
    confirmDelete.confirm({
      title: "Hapus transaksi?",
      description: `Hapus "${entry.title}" senilai ${formatCurrency(entry.amount)}?`,
      confirmLabel: "Hapus",
      destructive: true,
      onConfirm: () => {
        startTransition(async () => {
          const result = await deleteMoneyEntry(entry.id);
          if (!result.success) {
            toast.error(result.error ?? "Transaksi gagal dihapus.");
            return;
          }
          toast.success("Transaksi berhasil dihapus.");
          router.refresh();
        });
      },
    });
  };

  return (
    <div className="space-y-6">
      {confirmDelete.dialog}
      {editorOpen ? (
        <MoneyEntryDialog
          entry={editing}
          customCategories={customCategories}
          tags={tags}
          pending={pending}
          onClose={() => setEditorOpen(false)}
          onSubmit={(values) => {
            startTransition(async () => {
              const result = await saveMoneyEntry(values);
              if (!result.success) {
                toast.error(result.error ?? "Transaksi gagal disimpan.");
                return;
              }
              toast.success(
                editing
                  ? "Transaksi berhasil diperbarui."
                  : "Transaksi berhasil ditambahkan.",
              );
              setEditorOpen(false);
              router.refresh();
            });
          }}
        />
      ) : null}
      {tagManagerOpen ? (
        <TagManagerDialog
          tags={tags}
          pending={pending}
          onClose={() => setTagManagerOpen(false)}
          onCreate={(name) => {
            startTransition(async () => {
              const result = await createMoneyTag({ name });
              if (!result.success) {
                toast.error(result.error ?? "Tag gagal dibuat.");
                return;
              }
              toast.success("Tag berhasil ditambahkan.");
              router.refresh();
            });
          }}
          onDelete={(tag) => {
            confirmDelete.confirm({
              title: "Hapus tag?",
              description: `Tag "${tag.name}" akan dihapus dari seluruh transaksi yang menggunakannya.`,
              confirmLabel: "Hapus tag",
              destructive: true,
              onConfirm: () => {
                startTransition(async () => {
                  const result = await deleteMoneyTag(tag.id);
                  if (!result.success) {
                    toast.error(result.error ?? "Tag gagal dihapus.");
                    return;
                  }
                  if (tagFilter === tag.id) setTagFilter("all");
                  toast.success("Tag berhasil dihapus.");
                  router.refresh();
                });
              },
            });
          }}
        />
      ) : null}
      {categoryManagerOpen ? (
        <CategoryManagerDialog
          categories={customCategories}
          pending={pending}
          onClose={() => setCategoryManagerOpen(false)}
          onCreate={(entryType, name) => {
            startTransition(async () => {
              const result = await createMoneyCategory({ entryType, name });
              if (!result.success) {
                toast.error(result.error ?? "Kategori gagal dibuat.");
                return;
              }
              toast.success("Kategori berhasil ditambahkan.");
              router.refresh();
            });
          }}
          onDelete={(category) => {
            confirmDelete.confirm({
              title: "Hapus kategori?",
              description: `Kategori "${category.name}" tidak lagi muncul pada pilihan transaksi. Riwayat lama tetap tersimpan.`,
              confirmLabel: "Hapus kategori",
              destructive: true,
              onConfirm: () => {
                startTransition(async () => {
                  const result = await deleteMoneyCategory(category.id);
                  if (!result.success) {
                    toast.error(result.error ?? "Kategori gagal dihapus.");
                    return;
                  }
                  toast.success("Kategori berhasil dihapus.");
                  router.refresh();
                });
              },
            });
          }}
        />
      ) : null}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Manajemen Keuangan
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Pantau saldo, pemasukan, dan pengeluaran operasional dalam satu
            laporan terpusat.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap">
          <Button
            variant="outline"
            className="justify-center"
            onClick={() => setCategoryManagerOpen(true)}
          >
            <Settings2 className="size-4" />
            Kategori
          </Button>
          <Button
            variant="outline"
            className="justify-center"
            onClick={() => setTagManagerOpen(true)}
          >
            <Tags className="size-4" />
            Tag
          </Button>

          <div className="relative">
            <Button
              variant="outline"
              className="w-full justify-center xl:w-auto"
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
            >
              <FileDown className="size-4" />
              Ekspor
            </Button>
            {exportDropdownOpen ? (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setExportDropdownOpen(false)}
                />
                <div className="absolute right-0 top-11 z-40 w-48 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                    onClick={() => {
                      exportToExcel();
                      setExportDropdownOpen(false);
                    }}
                  >
                    <FileSpreadsheet className="size-4 text-emerald-600" />
                    Ekspor Excel (.csv)
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                    onClick={() => {
                      exportToPDF();
                      setExportDropdownOpen(false);
                    }}
                  >
                    <FileText className="size-4 text-rose-600" />
                    Ekspor PDF (.pdf)
                  </button>
                </div>
              </>
            ) : null}
          </div>

          <Button className="justify-center sm:col-span-2 xl:col-span-1" onClick={openCreate}>
            <Plus className="size-4" />
            Tambah transaksi
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-4 xl:grid-cols-[minmax(420px,1fr)_minmax(220px,240px)_minmax(220px,240px)] xl:items-end">
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-zinc-500">
              Akun keuangan
            </div>
            <div className="grid w-full gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1 sm:grid-cols-3">
              <WalletFilterButton
                active={walletFilter === "all"}
                label="Semua"
                icon={WalletCards}
                onClick={() => setWalletFilter("all")}
              />
              <WalletFilterButton
                active={walletFilter === "cash"}
                label="Tunai"
                icon={Banknote}
                onClick={() => setWalletFilter("cash")}
              />
              <WalletFilterButton
                active={walletFilter === "qris"}
                label="QRIS"
                icon={QrCode}
                onClick={() => setWalletFilter("qris")}
              />
            </div>
          </div>
          <label className="space-y-1.5 text-xs font-medium text-zinc-500">
            Bulan
            <Select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="w-full text-sm text-zinc-900"
            >
              <option value="all">Semua bulan</option>
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month)}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1.5 text-xs font-medium text-zinc-500">
            Filter tag
            <Select
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
              className="w-full text-sm text-zinc-900"
            >
              <option value="all">Semua tag</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </Select>
          </label>
          <div className="text-xs text-zinc-500 xl:col-span-3">
            Menampilkan data{" "}
            <span className="font-medium text-zinc-900">
              {selectedWalletLabel}
            </span>{" "}
            pada{" "}
            <span className="font-medium text-zinc-900">
              {selectedMonthLabel}
            </span>
            {tagFilter !== "all" ? (
              <>
                {" "}
                dengan tag{" "}
                <span className="font-medium text-zinc-900">
                  {tags.find((tag) => tag.id === tagFilter)?.name}
                </span>
              </>
            ) : null}
            .
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title={
            selectedMonth === "all"
              ? `Saldo ${selectedWalletLabel}`
              : `Arus bersih ${selectedWalletLabel}`
          }
          value={formatCurrency(summary.balance)}
          icon={WalletCards}
          tone={summary.balance < 0 ? "danger" : "neutral"}
          variant="spacious"
        />
        <StatCard
          title={`Total pemasukan ${selectedWalletLabel}`}
          value={formatCurrency(summary.income)}
          icon={ArrowUpCircle}
          tone="success"
          variant="spacious"
        />
        <StatCard
          title={`Total pengeluaran ${selectedWalletLabel}`}
          value={formatCurrency(summary.expense)}
          icon={ArrowDownCircle}
          tone="danger"
          variant="spacious"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle>Riwayat transaksi</CardTitle>
              <CardDescription>
                Rincian aktivitas keuangan berdasarkan akun dan kategori.
              </CardDescription>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_160px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari judul atau kategori"
                  className="pl-9"
                />
              </div>
              <Select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as "all" | MoneyEntryType)
                }
              >
                <option value="all">Semua jenis</option>
                <option value="income">Uang masuk</option>
                <option value="expense">Uang keluar</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="min-w-0">
          {filteredEntries.length ? (
            <div className="min-w-0 max-w-full">
              <div className="space-y-3 md:hidden">
                {paginatedEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-zinc-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-zinc-500">
                          {formatDate(entry.occurredAt)}
                        </div>
                        <div className="mt-1 font-medium text-zinc-950">
                          {entry.title}
                        </div>
                        <div className="mt-0.5 text-xs text-zinc-500">
                          {entry.notes || "Tanpa keterangan tambahan"}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "shrink-0 text-right font-semibold",
                          entry.entryType === "income"
                            ? "text-emerald-700"
                            : "text-red-700",
                        )}
                      >
                        {entry.entryType === "income" ? "+" : "-"}
                        {formatCurrency(
                          entry.entryType === "income"
                            ? getNetAmount(entry)
                            : entry.amount,
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {getCategoryLabel(entry.category)}
                      </Badge>
                      <Badge variant="outline">
                        {entry.walletType === "cash" ? (
                          <Banknote className="mr-1 size-3.5" />
                        ) : (
                          <QrCode className="mr-1 size-3.5" />
                        )}
                        {walletLabels[entry.walletType]}
                      </Badge>
                      {entry.tags.map((tag) => (
                        <Badge key={tag.id} variant="outline">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                    {entry.walletType === "qris" &&
                    entry.entryType === "income" &&
                    entry.feePercentage > 0 ? (
                      <div className="mt-2 text-xs text-zinc-500">
                        Bruto {formatCurrency(entry.amount)} · potongan{" "}
                        {entry.feePercentage}%
                      </div>
                    ) : null}
                    <div className="mt-3 flex justify-end gap-1 border-t border-zinc-100 pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(entry);
                          setEditorOpen(true);
                        }}
                      >
                        <Edit2 className="size-4" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => handleDelete(entry)}
                      >
                        <Trash2 className="size-4" />
                        Hapus
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden max-w-full overflow-x-auto md:block">
                <Table className="min-w-[920px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Dompet</TableHead>
                      <TableHead>Catatan</TableHead>
                      <TableHead>Tag</TableHead>
                      <TableHead className="text-right">Nominal</TableHead>
                      <TableHead className="w-24 text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(entry.occurredAt)}
                        </TableCell>
                        <TableCell>
                          {getCategoryLabel(entry.category)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {entry.walletType === "cash" ? (
                              <Banknote className="mr-1 size-3.5" />
                            ) : (
                              <QrCode className="mr-1 size-3.5" />
                            )}
                            {walletLabels[entry.walletType]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{entry.title}</div>
                          <div className="max-w-80 truncate text-xs text-zinc-500">
                            {entry.notes || "Tanpa keterangan tambahan"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {entry.tags.length ? (
                            <div className="flex max-w-56 flex-wrap gap-1">
                              {entry.tags.map((tag) => (
                                <Badge key={tag.id} variant="outline">
                                  {tag.name}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-zinc-400">-</span>
                          )}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-semibold",
                            entry.entryType === "income"
                              ? "text-emerald-700"
                              : "text-red-700",
                          )}
                        >
                          {entry.entryType === "income" ? "+" : "-"}
                          {formatCurrency(
                            entry.entryType === "income"
                              ? getNetAmount(entry)
                              : entry.amount,
                          )}
                          {entry.walletType === "qris" &&
                          entry.entryType === "income" &&
                          entry.feePercentage > 0 ? (
                            <div className="mt-0.5 text-xs font-normal text-zinc-500">
                              Bruto {formatCurrency(entry.amount)} · potongan{" "}
                              {entry.feePercentage}%
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditing(entry);
                              setEditorOpen(true);
                            }}
                            aria-label={`Edit ${entry.title}`}
                          >
                            <Edit2 className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-zinc-400 hover:bg-red-50 hover:text-red-600"
                            onClick={() => handleDelete(entry)}
                            aria-label={`Hapus ${entry.title}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                page={activePage}
                pageSize={pageSize}
                totalItems={filteredEntries.length}
                onPageChange={setPage}
              />
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 p-8 text-center">
              <div>
                <Banknote className="mx-auto size-8 text-zinc-400" />
                <h3 className="mt-3 text-sm font-semibold">
                  Belum ada transaksi
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Tambahkan saldo awal atau transaksi pertama untuk memulai.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function WalletFilterButton({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: typeof WalletCards;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "min-w-0 rounded-lg px-2",
        active
          ? "bg-white text-zinc-950 shadow-sm hover:bg-white"
          : "text-zinc-500",
      )}
      onClick={onClick}
    >
      <Icon className="size-4" />
      {label}
    </Button>
  );
}
