"use client";

import { useState, type FormEvent } from "react";
import {
  Bug,
  CheckCircle2,
  Lightbulb,
  MessageSquareMore,
  MessagesSquare,
  Send,
} from "lucide-react";
import { showErrorToast, toast } from "@/lib/toast";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/features/admin/_components/page-header";
import {
  useMyFeedback,
  useSubmitFeedback,
} from "@/features/admin/feedback/use-feedback";
import { cn } from "@/lib/utils";
import type {
  FeedbackCategory,
  FeedbackStatus,
  SubmitFeedbackInput,
} from "@/types/feedback";

const categories: Array<{
  value: FeedbackCategory;
  label: string;
  description: string;
  icon: typeof Bug;
}> = [
  {
    value: "suggestion",
    label: "Saran",
    description: "Ide fitur atau perbaikan alur kerja.",
    icon: Lightbulb,
  },
  {
    value: "bug",
    label: "Bug",
    description: "Fitur error atau tidak berjalan semestinya.",
    icon: Bug,
  },
  {
    value: "criticism",
    label: "Kritik",
    description: "Hal yang perlu kami evaluasi dan benahi.",
    icon: MessageSquareMore,
  },
  {
    value: "other",
    label: "Lainnya",
    description: "Masukan lain terkait produk atau layanan.",
    icon: MessagesSquare,
  },
];

const initialForm: SubmitFeedbackInput = {
  category: "suggestion",
  subject: "",
  message: "",
  featureArea: "",
  pageUrl: "",
};

export function FeedbackPage() {
  const [form, setForm] = useState(initialForm);
  const { data = [], isLoading, isError } = useMyFeedback();
  const submitFeedback = useSubmitFeedback();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitFeedback.mutate(form, {
      onSuccess: (feedback) => {
        toast.success(
          `Masukan terkirim dengan nomor ${feedback.referenceCode}`,
        );
        setForm(initialForm);
      },
      onError: (error) =>
        showErrorToast(
          "Masukan belum dapat dikirim",
          error,
          "Masukan belum dapat dikirim.",
        ),
    });
  };

  return (
    <div>
      <PageHeader
        title="Bantu POSKART menjadi lebih baik"
        description="Kirim kritik, saran, laporan bug, atau masukan lainnya. Setiap kiriman masuk langsung ke tim POSKART."
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="overflow-hidden">
          <div className="border-b border-zinc-100 bg-zinc-950 px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-white/10">
                <MessageSquareMore className="size-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Kirim masukan</h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Jelaskan sedetail mungkin agar kami dapat menindaklanjuti.
                </p>
              </div>
            </div>
          </div>
          <CardContent className="pt-5">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-zinc-900">
                  Jenis masukan
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    const selected = form.category === category.value;
                    return (
                      <button
                        key={category.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          setForm({ ...form, category: category.value })
                        }
                        className={cn(
                          "flex items-start gap-3 rounded-2xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 active:translate-y-px",
                          selected
                            ? "border-zinc-950 bg-zinc-950 text-white"
                            : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50",
                        )}
                      >
                        <Icon
                          className={cn(
                            "mt-0.5 size-4 shrink-0",
                            selected ? "text-white" : "text-zinc-500",
                          )}
                        />
                        <span>
                          <span className="block text-sm font-semibold">
                            {category.label}
                          </span>
                          <span
                            className={cn(
                              "mt-0.5 block text-xs leading-5",
                              selected ? "text-zinc-300" : "text-zinc-500",
                            )}
                          >
                            {category.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-zinc-700 sm:col-span-2">
                  Judul
                  <Input
                    className="mt-1.5"
                    required
                    minLength={5}
                    maxLength={120}
                    value={form.subject}
                    onChange={(event) =>
                      setForm({ ...form, subject: event.target.value })
                    }
                    placeholder="Contoh: Preview frame terpotong saat dicetak"
                  />
                </label>
                <label className="block text-sm font-medium text-zinc-700">
                  Bagian aplikasi
                  <Input
                    className="mt-1.5"
                    maxLength={80}
                    value={form.featureArea}
                    onChange={(event) =>
                      setForm({ ...form, featureArea: event.target.value })
                    }
                    placeholder="Contoh: Pricing, Gallery, Flutter kiosk"
                  />
                </label>
                <label className="block text-sm font-medium text-zinc-700">
                  Halaman terkait
                  <Input
                    className="mt-1.5"
                    maxLength={500}
                    value={form.pageUrl}
                    onChange={(event) =>
                      setForm({ ...form, pageUrl: event.target.value })
                    }
                    placeholder="Contoh: /pricing"
                  />
                </label>
                <label className="block text-sm font-medium text-zinc-700 sm:col-span-2">
                  Detail
                  <Textarea
                    className="mt-1.5 min-h-40 resize-y rounded-2xl"
                    required
                    minLength={20}
                    maxLength={4000}
                    value={form.message}
                    onChange={(event) =>
                      setForm({ ...form, message: event.target.value })
                    }
                    placeholder="Ceritakan apa yang terjadi, hasil yang Anda harapkan, dan langkah untuk mengulanginya jika ini adalah bug."
                  />
                  <span className="mt-1.5 flex justify-between text-xs text-zinc-400">
                    <span>Minimal 20 karakter.</span>
                    <span>{form.message.length}/4000</span>
                  </span>
                </label>
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="lg"
                  disabled={submitFeedback.isPending}
                >
                  <Send className="size-4" />
                  {submitFeedback.isPending ? "Mengirim..." : "Kirim masukan"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat masukan Anda</CardTitle>
            <CardDescription>
              Pantau status masukan yang pernah dikirim dari akun ini.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : isError ? (
              <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-5 text-center">
                <Bug className="mb-3 size-7 text-red-600" />
                <p className="text-sm font-semibold text-red-950">
                  Riwayat belum dapat dimuat
                </p>
                <p className="mt-1 text-xs leading-5 text-red-700">
                  Coba muat ulang halaman setelah koneksi kembali stabil.
                </p>
              </div>
            ) : data.length === 0 ? (
              <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-5 text-center">
                <MessagesSquare className="mb-3 size-7 text-zinc-400" />
                <p className="text-sm font-semibold text-zinc-900">
                  Belum ada masukan
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Masukan pertama Anda akan muncul di sini setelah dikirim.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-zinc-200 p-4"
                  >
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
                    <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-zinc-500">
                      {item.message}
                    </p>
                    {item.adminNote ? (
                      <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
                        <span className="font-semibold">
                          Tanggapan POSKART:
                        </span>{" "}
                        {item.adminNote}
                      </div>
                    ) : null}
                    <p className="mt-3 text-[11px] text-zinc-400">
                      {formatDate(item.createdAt)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />
        <div>
          <p className="text-sm font-semibold text-emerald-950">
            Masukan Anda dibaca oleh tim POSKART
          </p>
          <p className="mt-1 text-xs leading-5 text-emerald-800">
            Jangan mencantumkan password, PIN, credential payment gateway, atau
            data sensitif lainnya.
          </p>
        </div>
      </div>
    </div>
  );
}

export function FeedbackStatusBadge({ status }: { status: FeedbackStatus }) {
  const config: Record<
    FeedbackStatus,
    { label: string; variant: "default" | "warning" | "success" | "secondary" }
  > = {
    new: { label: "Baru", variant: "default" },
    reviewing: { label: "Ditinjau", variant: "warning" },
    planned: { label: "Direncanakan", variant: "secondary" },
    completed: { label: "Selesai", variant: "success" },
    closed: { label: "Ditutup", variant: "secondary" },
  };
  const item = config[status];
  return <Badge variant={item.variant}>{item.label}</Badge>;
}

export function categoryLabel(category: FeedbackCategory) {
  return categories.find((item) => item.value === category)?.label ?? category;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}
