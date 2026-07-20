"use client";

import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export function TablePagination({
  page,
  pageSize,
  totalItems,
  isLoading = false,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-zinc-100 px-1 pt-4 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
      <span>
        Menampilkan {start}-{end} dari {totalItems} data
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isLoading || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
          Sebelumnya
        </Button>
        <span className="flex min-w-20 items-center justify-center gap-1.5 text-center text-xs font-medium text-zinc-700">
          {isLoading ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
          {page} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isLoading || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Berikutnya
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
