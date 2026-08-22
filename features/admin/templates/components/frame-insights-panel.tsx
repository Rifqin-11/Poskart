"use client";

import {
  Activity,
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  Clock3,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import gsap from "gsap";
import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  FrameInsightsPeriod,
  FrameUsageInsight,
  Template,
} from "@/types/template";

const PERIOD_OPTIONS: Array<{ value: FrameInsightsPeriod; label: string }> = [
  { value: "7d", label: "7 hari" },
  { value: "30d", label: "30 hari" },
  { value: "90d", label: "90 hari" },
  { value: "all", label: "Semua waktu" },
];

type InsightStatus =
  | "popular"
  | "review"
  | "unused"
  | "unassigned"
  | "new"
  | "active";

type FrameInsightView = FrameUsageInsight & {
  template: Template;
  ageDays: number;
  usageRate: number;
  status: InsightStatus;
};

export function FrameInsightsPanel({
  templates,
  insights,
  period,
  isLoading,
  isError,
  onPeriodChange,
  onRetry,
}: {
  templates: Template[];
  insights: FrameUsageInsight[];
  period: FrameInsightsPeriod;
  isLoading: boolean;
  isError: boolean;
  onPeriodChange: (period: FrameInsightsPeriod) => void;
  onRetry: () => void;
}) {
  const frameTemplates = templates.filter((template) => template.category === "frame");
  const [showPriorityReview, setShowPriorityReview] = useState(false);
  const priorityReviewRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!showPriorityReview || !priorityReviewRef.current) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        priorityReviewRef.current,
        { height: 0, opacity: 0, y: -8 },
        {
          height: "auto",
          opacity: 1,
          y: 0,
          duration: 0.35,
          ease: "power2.out",
          clearProps: "height,transform",
        },
      );
    }, priorityReviewRef);

    return () => context.revert();
  }, [showPriorityReview]);
  const insightByTemplateId = new Map(
    insights.map((insight) => [insight.templateId, insight]),
  );
  const views = buildInsightViews(frameTemplates, insightByTemplateId);
  const popular = [...views].sort(
    (a, b) => b.sessionCount - a.sessionCount || b.usageRate - a.usageRate,
  )[0];
  const leastUsed = [...views]
    .filter((view) => view.assignedDevices > 0 && view.ageDays >= 14)
    .sort((a, b) => a.usageRate - b.usageRate || a.sessionCount - b.sessionCount)[0];
  const unusedCount = views.filter(
    (view) => view.assignedDevices > 0 && view.sessionCount === 0,
  ).length;
  const reviewCount = views.filter((view) => view.status === "review").length;
  const priorityViews = [...views]
    .sort((a, b) => {
      const statusOrder: Record<InsightStatus, number> = {
        review: 0,
        unused: 1,
        unassigned: 2,
        new: 3,
        active: 4,
        popular: 5,
      };
      return (
        statusOrder[a.status] - statusOrder[b.status] ||
        b.sessionCount - a.sessionCount
      );
    })
    .slice(0, 6);

  return (
    <Card
      className="mb-6 overflow-hidden border-zinc-200/90 shadow-[0_12px_36px_rgba(24,24,27,0.07)]"
      style={{
        background:
          "linear-gradient(135deg, #ffffff 0%, #fcfcfd 54%, #f3f5f8 100%)",
      }}
    >
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 border-b border-zinc-200/80 bg-white/70 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#00357B] text-white shadow-sm shadow-[#00357B]/20">
              <Sparkles className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-zinc-950">
                  Frame Insights
                </h2>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-[#00357B]">
                  Sesi produksi
                </span>
              </div>
              <p className="mt-1 max-w-xl text-xs leading-4 text-zinc-500">
                Temukan frame yang paling aktif, belum digunakan, atau perlu
                ditinjau berdasarkan pemakaian perangkat.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 self-start rounded-xl border border-zinc-200 bg-white/95 p-1 shadow-sm sm:self-auto">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
                  period === option.value
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
                )}
                onClick={() => onPeriodChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <InsightsLoading />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <div className="grid size-10 place-items-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900">
                Statistik frame belum dapat dimuat
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Coba lagi setelah migrasi statistik diterapkan.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="size-3.5" /> Coba lagi
            </Button>
          </div>
        ) : frameTemplates.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-zinc-500">
            Insight akan muncul setelah ada frame template.
          </div>
        ) : (
          <>
            <div className="grid gap-2.5 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-4">
              <InsightSummaryCard
                label="Frame terpopuler"
                icon={<TrendingUp className="size-4" />}
                value={popular?.template.name ?? "Belum ada data"}
                detail={popular ? `${formatNumber(popular.sessionCount)} sesi` : "Belum ada sesi produksi"}
                tone="blue"
              />
              <InsightSummaryCard
                label="Frame jarang digunakan"
                icon={<TrendingDown className="size-4" />}
                value={leastUsed?.template.name ?? "Belum ada data"}
                detail={leastUsed ? `${formatRate(leastUsed.usageRate)} sesi/hari/perangkat` : "Belum ada frame terpasang"}
                tone="amber"
              />
              <InsightSummaryCard
                label="Belum pernah dipakai"
                icon={<Clock3 className="size-4" />}
                value={formatNumber(unusedCount)}
                detail="frame terpasang tanpa sesi"
                tone="violet"
              />
              <InsightSummaryCard
                label="Perlu ditinjau"
                icon={<AlertTriangle className="size-4" />}
                value={formatNumber(reviewCount)}
                detail="pemakaian rendah relatif"
                tone="red"
              />
            </div>

            <div className="border-t border-zinc-200/80 bg-white/55 px-4 py-2.5 sm:px-5">
              <button
                type="button"
                className="group flex w-full items-center justify-between gap-3 text-left text-xs font-medium text-[#00357B] transition-colors hover:text-[#014EB4]"
                onClick={() => setShowPriorityReview((open) => !open)}
                aria-expanded={showPriorityReview}
              >
                <span className="inline-flex items-center gap-2">
                  {showPriorityReview
                    ? "Sembunyikan prioritas review"
                    : `Tampilkan prioritas review${reviewCount > 0 ? ` (${reviewCount})` : ""}`}
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform duration-300",
                      showPriorityReview && "rotate-180",
                    )}
                  />
                </span>
                <span className="text-[11px] text-zinc-400">
                  {formatPeriodLabel(period)}
                </span>
              </button>
            </div>
            {showPriorityReview ? (
              <div
                ref={priorityReviewRef}
                className="border-t border-zinc-200/80 bg-white/55 px-4 py-4 sm:px-5"
              >
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-zinc-950">
                    Prioritas review frame
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    Kecepatan pemakaian = sesi dibagi hari aktif dan perangkat.
                    Frame baru diberi waktu mengumpulkan data.
                  </p>
                </div>
                <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  {priorityViews.map((view) => (
                    <FrameInsightRow key={view.template.id} view={view} />
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function buildInsightViews(
  templates: Template[],
  insightByTemplateId: Map<string, FrameUsageInsight>,
): FrameInsightView[] {
  const rawViews = templates.map((template) => {
    const insight = insightByTemplateId.get(template.id);
    const ageDays = Math.max(
      0,
      Math.floor((Date.now() - new Date(template.createdAt).getTime()) / 86_400_000),
    );
    const sessionCount = insight?.sessionCount ?? 0;
    const activeDays = insight?.activeDays ?? 0;
    const assignedDevices = insight?.assignedDevices ?? 0;
    const usageRate =
      sessionCount / Math.max(activeDays, 1) / Math.max(assignedDevices, 1);

    return {
      template,
      templateId: template.id,
      sessionCount,
      activeDays,
      lastUsedAt: insight?.lastUsedAt ?? null,
      assignedDevices,
      ageDays,
      usageRate,
      status: "active" as InsightStatus,
    };
  });

  const eligible = rawViews
    .filter((view) => view.assignedDevices > 0 && view.ageDays >= 14)
    .sort((a, b) => b.usageRate - a.usageRate);
  const topThreshold = eligible[Math.max(0, Math.ceil(eligible.length * 0.2) - 1)]?.usageRate ?? 0;
  const bottomThreshold = eligible[Math.min(eligible.length - 1, Math.floor(eligible.length * 0.8))]?.usageRate ?? 0;

  return rawViews.map((view) => {
    let status: InsightStatus = "active";
    if (view.assignedDevices === 0) status = "unassigned";
    else if (view.ageDays < 14) status = "new";
    else if (
      view.ageDays >= 30 &&
      (view.sessionCount === 0 ||
        (eligible.length > 1 && view.usageRate <= bottomThreshold))
    ) {
      status = "review";
    } else if (view.sessionCount === 0) status = "unused";
    else if (
      eligible.length > 1 &&
      view.sessionCount >= 3 &&
      view.usageRate >= topThreshold
    ) {
      status = "popular";
    }
    return { ...view, status };
  });
}

function FrameInsightRow({ view }: { view: FrameInsightView }) {
  const status = getStatusMeta(view.status);
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-950/[0.025]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900">
            {view.template.name}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{getAgeLabel(view.ageDays)}</p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold", status.className)}>
          {status.label}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <Metric label="Sesi" value={formatNumber(view.sessionCount)} />
        <Metric label="Perangkat" value={formatNumber(view.assignedDevices)} />
        <Metric label="Hari aktif" value={formatNumber(view.activeDays)} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
        <span className="inline-flex items-center gap-1">
          <Activity className="size-3" /> {formatRate(view.usageRate)} sesi/hari/perangkat
        </span>
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="size-3" /> {formatLastUsed(view.lastUsedAt)}
        </span>
      </div>
    </div>
  );
}

function InsightSummaryCard({
  label,
  icon,
  value,
  detail,
  tone,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  detail: string;
  tone: "blue" | "amber" | "violet" | "red";
}) {
  const toneClasses = {
    blue: { icon: "bg-blue-50 text-[#00357B]", line: "bg-blue-500" },
    amber: { icon: "bg-amber-50 text-amber-700", line: "bg-amber-400" },
    violet: { icon: "bg-violet-50 text-violet-700", line: "bg-violet-500" },
    red: { icon: "bg-red-50 text-red-700", line: "bg-red-500" },
  };
  return (
    <div className="group relative overflow-hidden rounded-xl border border-zinc-200/80 bg-white/85 p-3 shadow-sm shadow-zinc-950/[0.025] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-zinc-950/[0.06]">
      <span className={cn("absolute inset-x-0 top-0 h-0.5", toneClasses[tone].line)} />
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
        <span className={cn("grid size-6 place-items-center rounded-md", toneClasses[tone].icon)}>
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-2 truncate text-xs font-semibold text-zinc-950">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-zinc-500">{detail}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 px-2.5 py-2">
      <p className="text-[10px] text-zinc-400">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums text-zinc-800">{value}</p>
    </div>
  );
}

function InsightsLoading() {
  return (
    <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="h-28 animate-pulse rounded-2xl bg-zinc-100" />
      ))}
    </div>
  );
}

function getStatusMeta(status: InsightStatus) {
  return {
    popular: { label: "Populer", className: "bg-blue-50 text-[#00357B]" },
    review: { label: "Perlu ditinjau", className: "bg-red-50 text-red-700" },
    unused: { label: "Belum digunakan", className: "bg-amber-50 text-amber-700" },
    unassigned: { label: "Belum dipasang", className: "bg-zinc-100 text-zinc-600" },
    new: { label: "Data belum cukup", className: "bg-violet-50 text-violet-700" },
    active: { label: "Aktif", className: "bg-emerald-50 text-emerald-700" },
  }[status];
}

function formatNumber(value: number) {
  return value.toLocaleString("id-ID");
}

function formatRate(value: number) {
  return value.toLocaleString("id-ID", {
    maximumFractionDigits: 1,
  });
}

function formatLastUsed(value: string | null) {
  if (!value) return "Belum pernah";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getAgeLabel(ageDays: number) {
  if (ageDays < 30) return `${formatNumber(ageDays)} hari sejak dibuat`;
  const months = Math.floor(ageDays / 30);
  return `${formatNumber(months)} bulan sejak dibuat`;
}

function formatPeriodLabel(period: FrameInsightsPeriod) {
  return PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? "Semua waktu";
}
