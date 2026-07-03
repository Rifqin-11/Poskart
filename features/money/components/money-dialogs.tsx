"use client";

import { useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Tag,
  Tags,
  Trash2,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { categories, toLocalDateTime } from "@/features/money/money-dashboard.utils";
import { formatCurrency } from "@/lib/utils";
import type {
  MoneyCategory,
  MoneyCustomCategory,
  MoneyEntry,
  MoneyEntryInput,
  MoneyEntryType,
  MoneyTag,
  MoneyWallet,
  MoneyWalletType,
} from "@/types/money";

export function MoneyEntryDialog({
  entry,
  customCategories,
  tags,
  wallets,
  pending,
  onClose,
  onSubmit,
}: {
  entry: MoneyEntry | null;
  customCategories: MoneyCustomCategory[];
  tags: MoneyTag[];
  wallets: MoneyWallet[];
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
  const [feePercentage, setFeePercentage] = useState(entry?.feePercentage ?? 0);
  const [title, setTitle] = useState(entry?.title ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [selectedTagIds, setSelectedTagIds] = useState(
    entry?.tags.map((tag) => tag.id) ?? [],
  );
  const [occurredAt, setOccurredAt] = useState(
    toLocalDateTime(entry?.occurredAt ?? new Date().toISOString()),
  );

  const changeType = (nextType: MoneyEntryType) => {
    setEntryType(nextType);
    setCategory(categories[nextType][0].value);
  };
  const availableCategories = [
    ...categories[entryType],
    ...customCategories
      .filter((item) => item.entryType === entryType)
      .map((item) => ({ value: item.name, label: item.name })),
  ];

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={entry ? "Edit transaksi" : "Tambah transaksi"}
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
            tagIds: selectedTagIds,
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
            Pemasukan
          </Button>
          <Button
            type="button"
            variant={entryType === "expense" ? "destructive" : "outline"}
            onClick={() => changeType("expense")}
          >
            <ArrowDownCircle className="size-4" />
            Pengeluaran
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium">
            Kategori
            <Select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as MoneyCategory)
              }
            >
              {availableCategories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Nominal transaksi
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
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium">
            Dompet
            <Select
              value={walletType}
              onChange={(event) =>
                setWalletType(event.target.value as MoneyWalletType)
              }
            >
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Catatan transaksi
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              placeholder="Contoh: Pendapatan acara"
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
          Waktu
          <Input
            type="datetime-local"
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            required
          />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">
          Keterangan tambahan
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={500}
            placeholder="Informasi opsional mengenai transaksi"
          />
        </label>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Tag transaksi</span>
            <span className="text-xs text-zinc-500">Maksimal 10 tag</span>
          </div>
          {tags.length ? (
            <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-xl border border-zinc-200 p-3">
              {tags.map((tag) => {
                const selected = selectedTagIds.includes(tag.id);
                return (
                  <Button
                    key={tag.id}
                    type="button"
                    size="sm"
                    variant={selected ? "default" : "outline"}
                    onClick={() =>
                      setSelectedTagIds((current) =>
                        selected
                          ? current.filter((id) => id !== tag.id)
                          : current.length < 10
                            ? [...current, tag.id]
                            : current,
                      )
                    }
                  >
                    <Tag className="size-3.5" />
                    {tag.name}
                  </Button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
              Belum ada tag. Tambahkan melalui tombol Tag pada halaman utama.
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Menyimpan..." : "Simpan transaksi"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function WalletManagerDialog({
  wallets,
  pending,
  onClose,
  onCreate,
  onDelete,
}: {
  wallets: MoneyWallet[];
  pending: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  onDelete: (wallet: MoneyWallet) => void;
}) {
  const [name, setName] = useState("");
  const customWallets = wallets.filter((wallet) => !wallet.isDefault);

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Kelola dompet"
      overlayClassName="z-[80]"
    >
      <div className="space-y-5">
        <p className="text-sm text-zinc-500">
          Tambahkan dompet operasional selain Tunai dan QRIS, misalnya Bank BCA,
          E-Wallet, atau Kas Event.
        </p>
        <form
          className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            onCreate(name);
            setName("");
          }}
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={2}
            maxLength={40}
            placeholder="Contoh: Bank BCA, Kas Event"
            required
          />
          <Button type="submit" disabled={pending || name.trim().length < 2}>
            <Plus className="size-4" />
            Tambah dompet
          </Button>
        </form>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <WalletCards className="size-4" />
            Dompet tersedia
          </div>
          <div className="divide-y overflow-hidden rounded-xl border border-zinc-200">
            {wallets.map((wallet) => (
              <div
                key={wallet.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-medium">{wallet.name}</div>
                  <div className="text-xs text-zinc-500">
                    {wallet.isDefault ? "Dompet bawaan" : "Dompet kustom"}
                  </div>
                </div>
                {!wallet.isDefault ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    onClick={() => onDelete(wallet)}
                    aria-label={`Hapus dompet ${wallet.name}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
          {!customWallets.length ? (
            <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
              Belum ada dompet kustom.
            </div>
          ) : null}
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Selesai
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function TagManagerDialog({
  tags,
  pending,
  onClose,
  onCreate,
  onDelete,
}: {
  tags: MoneyTag[];
  pending: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  onDelete: (tag: MoneyTag) => void;
}) {
  const [name, setName] = useState("");

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Kelola tag transaksi"
    >
      <div className="space-y-5">
        <p className="text-sm text-zinc-500">
          Tag dapat dipakai pada beberapa transaksi sekaligus untuk
          pengelompokan dan penyaringan laporan.
        </p>
        <form
          className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            onCreate(name);
            setName("");
          }}
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={2}
            maxLength={40}
            placeholder="Contoh: CFD, Cabang A, Event Juni"
            required
          />
          <Button type="submit" disabled={pending || name.trim().length < 2}>
            <Plus className="size-4" />
            Tambah tag
          </Button>
        </form>
        {tags.length ? (
          <div className="max-h-72 divide-y overflow-y-auto rounded-xl border border-zinc-200">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Tag className="size-4 text-zinc-400" />
                  {tag.name}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-zinc-400 hover:bg-red-50 hover:text-red-600"
                  onClick={() => onDelete(tag)}
                  aria-label={`Hapus tag ${tag.name}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500">
            Belum ada tag kustom.
          </div>
        )}
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Selesai
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function CategoryManagerDialog({
  categories: customCategories,
  pending,
  onClose,
  onCreate,
  onDelete,
}: {
  categories: MoneyCustomCategory[];
  pending: boolean;
  onClose: () => void;
  onCreate: (entryType: MoneyEntryType, name: string) => void;
  onDelete: (category: MoneyCustomCategory) => void;
}) {
  const [entryType, setEntryType] = useState<MoneyEntryType>("income");
  const [name, setName] = useState("");

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Kelola kategori transaksi"
    >
      <div className="space-y-5">
        <p className="text-sm text-zinc-500">
          Buat kategori khusus untuk kebutuhan operasional organisasi Anda.
          Kategori bawaan tetap tersedia untuk menjaga konsistensi laporan.
        </p>
        <form
          className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-[150px_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            onCreate(entryType, name);
            setName("");
          }}
        >
          <Select
            value={entryType}
            onChange={(event) =>
              setEntryType(event.target.value as MoneyEntryType)
            }
            aria-label="Jenis kategori"
          >
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </Select>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={2}
            maxLength={60}
            placeholder="Contoh: Sewa peralatan"
            required
          />
          <Button type="submit" disabled={pending || name.trim().length < 2}>
            <Plus className="size-4" />
            Tambah
          </Button>
        </form>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Tags className="size-4" />
            Kategori kustom
          </div>
          {customCategories.length ? (
            <div className="max-h-72 divide-y overflow-y-auto rounded-xl border border-zinc-200">
              {customCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-medium">{category.name}</div>
                    <div className="text-xs text-zinc-500">
                      {category.entryType === "income"
                        ? "Pemasukan"
                        : "Pengeluaran"}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    onClick={() => onDelete(category)}
                    aria-label={`Hapus kategori ${category.name}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500">
              Belum ada kategori kustom.
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Selesai
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
