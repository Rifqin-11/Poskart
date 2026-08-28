"use client";

import {
  Check,
  ChevronDown,
  Landmark,
  LoaderCircle,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing-error";
import { cn } from "@/lib/utils";

const BANK_API_URL = "https://bank.thecloudalert.com/api/get/";
const OTHER_BANK_VALUE = "__other_bank__";

type BankOption = {
  id: string;
  code: string;
  name: string;
};

type BankApiResponse = {
  data?: unknown;
};

function normalizeBankOptions(payload: BankApiResponse): BankOption[] {
  if (!Array.isArray(payload.data)) return [];

  const banks = payload.data.flatMap((row) => {
    if (!Array.isArray(row)) return [];
    const [id, bankType, code, name] = row;
    if (
      typeof id !== "string" ||
      typeof name !== "string" ||
      (typeof bankType === "string" &&
        bankType
          .toLocaleUpperCase("id")
          .includes("BERKEDUDUKAN DI LUAR NEGERI"))
    ) {
      return [];
    }

    return [
      {
        id,
        code: typeof code === "string" ? code : "",
        name: name.trim(),
      },
    ];
  });

  return banks
    .filter((bank) => bank.name.length > 0)
    .sort((first, second) => first.name.localeCompare(second.name, "id"));
}

export function BankSelect({
  value,
  onValueChange,
  disabled = false,
}: {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [useCustomBank, setUseCustomBank] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBanks() {
      try {
        const response = await fetch(BANK_API_URL, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Bank API is unavailable.");

        const payload = (await response.json()) as BankApiResponse;
        const options = normalizeBankOptions(payload);
        if (options.length === 0) throw new Error("No bank data was returned.");
        setBanks(options);
      } catch (error) {
        if (controller.signal.aborted) return;
        setLoadError(
          getUserFacingErrorMessage(error, "Daftar bank tidak tersedia."),
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadBanks();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (
        rootRef.current &&
        event.target instanceof Node &&
        !rootRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const selectedBank = useMemo(
    () =>
      banks.find(
        (bank) =>
          bank.name.toLocaleLowerCase("id") === value.toLocaleLowerCase("id"),
      ) ?? null,
    [banks, value],
  );
  const isCustomValue =
    useCustomBank ||
    (!!value && (loadError !== null || (banks.length > 0 && !selectedBank)));
  const filteredBanks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id");
    if (!normalizedQuery) return banks;

    return banks.filter((bank) =>
      `${bank.name} ${bank.code}`
        .toLocaleLowerCase("id")
        .includes(normalizedQuery),
    );
  }, [banks, query]);

  const chooseBank = (bank: BankOption) => {
    onValueChange(bank.name);
    setUseCustomBank(false);
    setQuery("");
    setOpen(false);
  };

  const chooseOtherBank = () => {
    setUseCustomBank(true);
    onValueChange("");
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative mt-1.5">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-9 w-full items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 text-left text-sm shadow-sm outline-none transition-colors hover:border-zinc-300 focus:border-[#00357B] focus:ring-2 focus:ring-[#00357B]/10 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => setOpen((current) => !current)}
      >
        <Landmark className="size-4 shrink-0 text-zinc-400" />
        <span
          title={value || undefined}
          className={cn(
            "min-w-0 flex-1 truncate",
            value ? "text-zinc-900" : "text-zinc-400",
          )}
        >
          {value || "Pilih bank"}
        </span>
        {isLoading ? (
          <LoaderCircle className="size-4 shrink-0 animate-spin text-zinc-400" />
        ) : (
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-zinc-400 transition-transform",
              open && "rotate-180",
            )}
          />
        )}
      </button>

      {isCustomValue ? (
        <div className="mt-2">
          <Input
            value={value}
            disabled={disabled}
            placeholder="Tulis nama bank"
            onChange={(event) => onValueChange(event.target.value)}
          />
          <p className="mt-1 text-[11px] text-zinc-500">
            Bank tidak ada dalam daftar? Masukkan nama bank secara manual.
          </p>
        </div>
      ) : null}

      {open ? (
        <div className="absolute z-30 mt-2 w-[min(28rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-950/10">
          <div className="border-b border-zinc-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                ref={searchInputRef}
                value={query}
                placeholder="Cari nama atau kode bank..."
                className="pl-9"
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-1.5" role="listbox">
            {isLoading ? (
              <div className="flex items-center gap-2 px-3 py-6 text-sm text-zinc-500">
                <LoaderCircle className="size-4 animate-spin" /> Memuat daftar
                bank...
              </div>
            ) : loadError ? (
              <p className="px-3 py-3 text-xs leading-5 text-zinc-500">
                Daftar bank sedang tidak tersedia. Anda tetap dapat memilih
                Lainnya dan memasukkan nama bank secara manual.
              </p>
            ) : filteredBanks.length === 0 ? (
              <p className="px-3 py-3 text-sm text-zinc-500">
                Bank tidak ditemukan.
              </p>
            ) : (
              filteredBanks.map((bank) => (
                <button
                  key={bank.id}
                  type="button"
                  role="option"
                  aria-selected={selectedBank?.id === bank.id}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-zinc-50"
                  onClick={() => chooseBank(bank)}
                >
                  <span className="min-w-0 flex-1 text-pretty font-medium leading-5 text-zinc-800">
                    {bank.name}
                  </span>
                  {bank.code ? (
                    <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
                      {bank.code}
                    </span>
                  ) : null}
                  {selectedBank?.id === bank.id ? (
                    <Check className="size-4 shrink-0 text-[#00357B]" />
                  ) : null}
                </button>
              ))
            )}
          </div>

          <div className="border-t border-zinc-100 p-1.5">
            <button
              type="button"
              value={OTHER_BANK_VALUE}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
              onClick={chooseOtherBank}
            >
              <Landmark className="size-4 text-zinc-400" />
              Lainnya
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
