"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  categoryLabel,
  FeedbackStatusBadge,
} from "@/features/admin/feedback/feedback-page";
import {
  useReviewProductFeedback,
  useSuperAdminFeedback,
} from "@/features/admin/superadmin/use-superadmin";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing-error";
import type {
  FeedbackCategory,
  FeedbackStatus,
  ProductFeedback,
} from "@/types/feedback";

const statuses: Array<FeedbackStatus | "all"> = [
  "all",
  "new",
  "reviewing",
  "planned",
  "completed",
  "closed",
];
const categories: Array<FeedbackCategory | "all"> = [
  "all",
  "suggestion",
  "bug",
  "criticism",
  "other",
];

export function ProductFeedbackManagement() {
  const { data = [], isLoading, isFetching } = useSuperAdminFeedback();
  const review = useReviewProductFeedback();
  const [status, setStatus] = useState<FeedbackStatus | "all">("new");
  const [category, setCategory] = useState<FeedbackCategory | "all">("all");
  const [selected, setSelected] = useState<ProductFeedback | null>(null);
  const filtered = useMemo(
    () =>
      data.filter(
        (item) =>
          (status === "all" || item.status === status) &&
          (category === "all" || item.category === category),
      ),
    [category, data, status],
  );

  const handleReview = (input: {
    status: FeedbackStatus;
    adminNote: string;
  }) => {
    if (!selected) return;
    review.mutate(
      { id: selected.id, ...input },
      {
        onSuccess: () => {
          toast.success("Status feedback diperbarui");
          setSelected(null);
        },
        onError: (error) =>
          toast.error(
            getUserFacingErrorMessage(
              error,
              "Feedback belum dapat diperbarui.",
            ),
          ),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <Select
          aria-label="Filter feedback status"
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
        >
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item === "all" ? "Semua status" : statusLabel(item)}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter feedback category"
          value={category}
          onChange={(event) =>
            setCategory(event.target.value as typeof category)
          }
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item === "all" ? "Semua kategori" : categoryLabel(item)}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 text-center">
          <CheckCircle2 className="mb-3 size-8 text-emerald-600" />
          <p className="text-sm font-semibold text-zinc-900">
            Tidak ada feedback yang cocok
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Feedback baru dari dashboard organisasi akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/50"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <FeedbackStatusBadge status={item.status} />
                    <Badge variant="secondary">
                      {categoryLabel(item.category)}
                    </Badge>
                    <code className="text-[11px] text-zinc-400">
                      {item.referenceCode}
                    </code>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-zinc-950">
                    {item.subject}
                  </h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-600">
                    {item.message}
                  </p>
                  <div className="mt-3 grid gap-1 text-xs text-zinc-500 sm:grid-cols-2">
                    <span>
                      {item.organizationName} · {item.submitterEmail}
                    </span>
                    <span>
                      {item.featureArea || "Bagian aplikasi tidak diisi"}
                    </span>
                    <span>{formatDate(item.createdAt)}</span>
                    {item.pageUrl ? (
                      <span className="flex items-center gap-1">
                        <ExternalLink className="size-3" />
                        {item.pageUrl}
                      </span>
                    ) : null}
                  </div>
                  {item.adminNote ? (
                    <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
                      <strong>Catatan admin:</strong> {item.adminNote}
                    </div>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelected(item)}
                >
                  Review
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      {isFetching && !isLoading ? (
        <p className="text-right text-[11px] text-zinc-400">
          Refreshing feedback...
        </p>
      ) : null}
      {selected ? (
        <FeedbackReviewDialog
          feedback={selected}
          submitting={review.isPending}
          onClose={() => setSelected(null)}
          onSubmit={handleReview}
        />
      ) : null}
    </div>
  );
}

function FeedbackReviewDialog({
  feedback,
  submitting,
  onClose,
  onSubmit,
}: {
  feedback: ProductFeedback;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (input: { status: FeedbackStatus; adminNote: string }) => void;
}) {
  const [status, setStatus] = useState<FeedbackStatus>(feedback.status);
  const [adminNote, setAdminNote] = useState(feedback.adminNote ?? "");
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Review ${feedback.referenceCode}`}
    >
      <div className="space-y-4">
        <div className="rounded-2xl bg-zinc-50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {categoryLabel(feedback.category)}
            </Badge>
            <span className="text-xs text-zinc-500">
              {feedback.organizationName} · {feedback.submitterEmail}
            </span>
          </div>
          <h3 className="mt-3 text-base font-semibold text-zinc-950">
            {feedback.subject}
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-600">
            {feedback.message}
          </p>
        </div>
        <label className="block text-sm font-medium text-zinc-700">
          Status
          <Select
            className="mt-1.5"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as FeedbackStatus)
            }
          >
            {statuses
              .filter((item): item is FeedbackStatus => item !== "all")
              .map((item) => (
                <option key={item} value={item}>
                  {statusLabel(item)}
                </option>
              ))}
          </Select>
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Catatan untuk pengirim
          <Textarea
            className="mt-1.5 min-h-28 rounded-2xl"
            maxLength={2000}
            value={adminNote}
            onChange={(event) => setAdminNote(event.target.value)}
            placeholder="Contoh: Kami sudah meneruskan bug ini ke tim engineering."
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            disabled={submitting}
            onClick={() => onSubmit({ status, adminNote })}
          >
            {submitting ? "Menyimpan..." : "Simpan review"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function statusLabel(status: FeedbackStatus) {
  return {
    new: "Baru",
    reviewing: "Ditinjau",
    planned: "Direncanakan",
    completed: "Selesai",
    closed: "Ditutup",
  }[status];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}
