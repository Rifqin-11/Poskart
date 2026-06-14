"use client";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Edit2,
  Plus,
  QrCode,
  Search,
  Trash2,
  WalletCards,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteMoneyEntry, saveMoneyEntry } from "@/app/(admin)/money/actions";
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
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  MoneyCategory,
  MoneyEntry,
  MoneyEntryInput,
  MoneyEntryType,
  MoneyWalletType,
} from "@/types/money";

type WalletFilter = "all" | MoneyWalletType;

const walletLabels: Record<MoneyWalletType, string> = {
  cash: "Cash",
  qris: "QRIS",
};

const categoryLabels: Record<MoneyCategory, string> = {
  opening_balance: "Saldo awal",
  sales_income: "Pendapatan penjualan",
  other_income: "Pendapatan lain",
  operational_expense: "Biaya operasional",
  purchase: "Pembelian",
  withdrawal: "Penarikan uang",
  correction: "Koreksi saldo",
  other_expense: "Pengeluaran lain",
};

const categories: Record<
  MoneyEntryType,
  Array<{ value: MoneyCategory; label: string }>
> = {
  income: [
    { value: "opening_balance", label: "Saldo awal" },
    { value: "sales_income", label: "Pendapatan penjualan" },
    { value: "other_income", label: "Pendapatan lain" },
    { value: "correction", label: "Koreksi saldo masuk" },
  ],
  expense: [
    { value: "operational_expense", label: "Biaya operasional" },
    { value: "purchase", label: "Pembelian" },
    { value: "withdrawal", label: "Penarikan uang" },
    { value: "correction", label: "Koreksi saldo keluar" },
    { value: "other_expense", label: "Pengeluaran lain" },
  ],
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toLocalDateTime(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function getNetAmount(entry: MoneyEntry) {
  if (
    entry.walletType !== "qris" ||
    entry.entryType !== "income" ||
    entry.feePercentage <= 0
  ) {
    return entry.amount;
  }
  const feeAmount = Math.round((entry.amount * entry.feePercentage) / 100);
  return entry.amount - feeAmount;
}

export function MoneyDashboard({ entries }: { entries: MoneyEntry[] }) {
  const router = useRouter();
  const confirmDelete = useConfirmDialog();
  const [pending, startTransition] = useTransition();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<MoneyEntry | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | MoneyEntryType>("all");
  const [walletFilter, setWalletFilter] = useState<WalletFilter>("all");

  const walletEntries = useMemo(
    () =>
      entries.filter(
        (entry) =>
          walletFilter === "all" || entry.walletType === walletFilter,
      ),
    [entries, walletFilter],
  );

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return walletEntries.filter(
      (entry) =>
        (typeFilter === "all" || entry.entryType === typeFilter) &&
        (!query ||
          entry.title.toLowerCase().includes(query) ||
          entry.notes?.toLowerCase().includes(query) ||
          categoryLabels[entry.category].toLowerCase().includes(query)),
    );
  }, [search, typeFilter, walletEntries]);

  const summary = useMemo(() => {
    const income = walletEntries
      .filter((entry) => entry.entryType === "income")
      .reduce((total, entry) => total + getNetAmount(entry), 0);
    const expense = walletEntries
      .filter((entry) => entry.entryType === "expense")
      .reduce((total, entry) => total + entry.amount, 0);
    return { income, expense, balance: income - expense };
  }, [walletEntries]);

  const selectedWalletLabel =
    walletFilter === "all" ? "Gabungan" : walletLabels[walletFilter];

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const handleDelete = (entry: MoneyEntry) => {
    confirmDelete.confirm({
      title: "Hapus catatan uang?",
      description: `Hapus "${entry.title}" senilai ${formatCurrency(entry.amount)}?`,
      confirmLabel: "Hapus",
      destructive: true,
      onConfirm: () => {
        startTransition(async () => {
          const result = await deleteMoneyEntry(entry.id);
          if (!result.success) {
            toast.error(result.error ?? "Catatan gagal dihapus.");
            return;
          }
          toast.success("Catatan uang berhasil dihapus.");
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
          pending={pending}
          onClose={() => setEditorOpen(false)}
          onSubmit={(values) => {
            startTransition(async () => {
              const result = await saveMoneyEntry(values);
              if (!result.success) {
                toast.error(result.error ?? "Catatan gagal disimpan.");
                return;
              }
              toast.success(
                editing
                  ? "Catatan uang berhasil diubah."
                  : "Catatan uang berhasil ditambahkan.",
              );
              setEditorOpen(false);
              router.refresh();
            });
          }}
        />
      ) : null}

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <WalletCards className="size-3.5" />
            Money Management
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Uang yang Dipegang
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Catatan kas mandiri. Data ini tidak terhubung dengan POS atau
            transaksi photobooth.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Tambah catatan
        </Button>
      </div>

      <div className="inline-flex w-full rounded-xl border border-zinc-200 bg-zinc-50 p-1 sm:w-auto">
        <WalletFilterButton
          active={walletFilter === "all"}
          label="Gabungan"
          icon={WalletCards}
          onClick={() => setWalletFilter("all")}
        />
        <WalletFilterButton
          active={walletFilter === "cash"}
          label="Cash"
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

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label={`Saldo ${selectedWalletLabel}`}
          value={formatCurrency(summary.balance)}
          icon={WalletCards}
          tone={summary.balance < 0 ? "danger" : "neutral"}
        />
        <SummaryCard
          label={`Uang masuk ${selectedWalletLabel}`}
          value={formatCurrency(summary.income)}
          icon={ArrowUpCircle}
          tone="success"
        />
        <SummaryCard
          label={`Uang keluar ${selectedWalletLabel}`}
          value={formatCurrency(summary.expense)}
          icon={ArrowDownCircle}
          tone="danger"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle>Riwayat uang</CardTitle>
              <CardDescription>
                Semua pemasukan dan pengeluaran yang dicatat manual.
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
        <CardContent>
          {filteredEntries.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Catatan</TableHead>
                    <TableHead>Dompet</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead className="text-right">Nominal</TableHead>
                    <TableHead className="w-24 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(entry.occurredAt)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{entry.title}</div>
                        <div className="max-w-80 truncate text-xs text-zinc-500">
                          {entry.notes || "Tanpa catatan"}
                        </div>
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
                      <TableCell>{categoryLabels[entry.category]}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            entry.entryType === "income"
                              ? "success"
                              : "destructive"
                          }
                        >
                          {entry.entryType === "income" ? "Masuk" : "Keluar"}
                        </Badge>
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
          ) : (
            <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 p-8 text-center">
              <div>
                <Banknote className="mx-auto size-8 text-zinc-400" />
                <h3 className="mt-3 text-sm font-semibold">
                  Belum ada catatan uang
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Tambahkan saldo awal atau transaksi uang pertama.
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
        "flex-1 rounded-lg sm:min-w-32",
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

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof WalletCards;
  tone: "neutral" | "success" | "danger";
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <div className="text-sm text-zinc-500">{label}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">
            {value}
          </div>
        </div>
        <div
          className={cn(
            "grid size-11 place-items-center rounded-xl",
            tone === "success" && "bg-emerald-50 text-emerald-700",
            tone === "danger" && "bg-red-50 text-red-700",
            tone === "neutral" && "bg-zinc-100 text-zinc-700",
          )}
        >
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function MoneyEntryDialog({
  entry,
  pending,
  onClose,
  onSubmit,
}: {
  entry: MoneyEntry | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: MoneyEntryInput) => void;
}) {
  const [entryType, setEntryType] = useState<MoneyEntryType>(
    entry?.entryType ?? "income",
  );
  const [walletType, setWalletType] = useState<MoneyWalletType>(
    entry?.walletType ?? "cash",
  );
  const [category, setCategory] = useState<MoneyCategory>(
    entry?.category ?? "opening_balance",
  );
  const [amount, setAmount] = useState(entry?.amount ?? 0);
  const [feePercentage, setFeePercentage] = useState(
    entry?.feePercentage ?? 0,
  );
  const [title, setTitle] = useState(entry?.title ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [occurredAt, setOccurredAt] = useState(
    toLocalDateTime(entry?.occurredAt ?? new Date().toISOString()),
  );

  const changeType = (nextType: MoneyEntryType) => {
    setEntryType(nextType);
    setCategory(categories[nextType][0].value);
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={entry ? "Edit catatan uang" : "Tambah catatan uang"}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({
            id: entry?.id,
            walletType,
            entryType,
            category,
            amount,
            feePercentage,
            title,
            notes,
            occurredAt,
          });
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={entryType === "income" ? "default" : "outline"}
            onClick={() => changeType("income")}
          >
            <ArrowUpCircle className="size-4" />
            Uang masuk
          </Button>
          <Button
            type="button"
            variant={entryType === "expense" ? "destructive" : "outline"}
            onClick={() => changeType("expense")}
          >
            <ArrowDownCircle className="size-4" />
            Uang keluar
          </Button>
        </div>
        <label className="block space-y-1.5 text-sm font-medium">
          Dompet
          <Select
            value={walletType}
            onChange={(event) =>
              setWalletType(event.target.value as MoneyWalletType)
            }
          >
            <option value="cash">Cash</option>
            <option value="qris">QRIS</option>
          </Select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium">
            Kategori
            <Select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as MoneyCategory)
              }
            >
              {categories[entryType].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Nominal
            <Input
              type="number"
              min={1}
              value={amount || ""}
              onChange={(event) => setAmount(Number(event.target.value))}
              placeholder="0"
              required
            />
          </label>
        </div>
        {walletType === "qris" && entryType === "income" ? (
          <label className="block space-y-1.5 text-sm font-medium">
            Potongan QRIS (opsional)
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={feePercentage || ""}
                onChange={(event) =>
                  setFeePercentage(Number(event.target.value))
                }
                placeholder="0"
                className="pr-10"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                %
              </span>
            </div>
            <span className="block text-xs font-normal text-zinc-500">
              Diterima bersih:{" "}
              {formatCurrency(
                amount -
                  Math.round((amount * Math.max(feePercentage, 0)) / 100),
              )}
            </span>
          </label>
        ) : null}
        <label className="block space-y-1.5 text-sm font-medium">
          Judul
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder="Contoh: Saldo kas awal"
            required
          />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">
          Waktu
          <Input
            type="datetime-local"
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            required
          />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">
          Catatan
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={500}
            placeholder="Keterangan tambahan"
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Menyimpan..." : "Simpan catatan"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
