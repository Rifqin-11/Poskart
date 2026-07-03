import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  EventBreakdownItem,
  EventChartPoint,
  EventPeriodKey,
  EventPeriodStatistics,
  EventStatisticsData,
} from "@/server/admin/_shared/admin-types";
import { normalizeQrisTransactionStatus } from "@/server/payments/qris-status";

type EventTransactionRow = {
  id: string;
  amount: number | null;
  status: string | null;
  provider: string | null;
  created_at: string;
  print_count: number | null;
  template_id: string | null;
  paid_at: string | null;
  duitku_status_code: string | null;
  gateway_response: Record<string, unknown> | null;
  templates?: { name?: string | null } | { name?: string | null }[] | null;
};

type DateParts = {
  year: number;
  month: number;
  day: number;
};

const JAKARTA_TIME_ZONE = "Asia/Jakarta";
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export const EMPTY_EVENT_STATISTICS = createEmptyEventStatistics();

export async function getEventStatisticsForOrganization(
  client: SupabaseClient,
  organizationId: string,
): Promise<EventStatisticsData> {
  const now = new Date();
  const starts = getJakartaPeriodStarts(now);
  const earliestStart = new Date(
    Math.min(starts.daily.getTime(), starts.weekly.getTime(), starts.monthly.getTime()),
  );

  const { data, error } = await client
    .from("transactions")
    .select(
      "id,amount,status,provider,created_at,print_count,template_id,paid_at,duitku_status_code,gateway_response,templates(name)",
    )
    .eq("organization_id", organizationId)
    .gte("created_at", earliestStart.toISOString())
    .order("created_at", { ascending: true });

  if (error) throw error;

  const rows = ((data ?? []) as EventTransactionRow[]).map(
    normalizeQrisTransactionStatus,
  );

  return {
    generatedAt: now.toISOString(),
    periods: {
      daily: buildPeriodStatistics({
        key: "daily",
        label: "Harian",
        startsAt: starts.daily,
        rows,
        series: buildDailySeries(rows.filter((row) => row.status === "paid"), starts.daily),
      }),
      weekly: buildPeriodStatistics({
        key: "weekly",
        label: "Mingguan",
        startsAt: starts.weekly,
        rows,
        series: buildWeeklySeries(rows.filter((row) => row.status === "paid"), now),
      }),
      monthly: buildPeriodStatistics({
        key: "monthly",
        label: "Bulanan",
        startsAt: starts.monthly,
        rows,
        series: buildMonthlySeries(rows.filter((row) => row.status === "paid"), now),
      }),
    },
  };
}

function buildPeriodStatistics({
  key,
  label,
  startsAt,
  rows,
  series,
}: {
  key: EventPeriodKey;
  label: string;
  startsAt: Date;
  rows: EventTransactionRow[];
  series: EventChartPoint[];
}): EventPeriodStatistics {
  const periodRows = rows.filter(
    (row) => new Date(row.created_at).getTime() >= startsAt.getTime(),
  );
  const paidPeriodRows = periodRows.filter((row) => row.status === "paid");
  const qrisRows = periodRows.filter(
    (row) => normalizeProvider(row.provider) === "QRIS",
  );
  const qrisPaid = qrisRows.filter((row) => row.status === "paid").length;
  const qrisTotal = qrisRows.length;
  const qrisFailed = Math.max(qrisTotal - qrisPaid, 0);
  const qrisSuccessRate =
    qrisTotal > 0 ? Number(((qrisPaid / qrisTotal) * 100).toFixed(1)) : 0;

  return {
    key,
    label,
    startsAt: startsAt.toISOString(),
    totalSessions: paidPeriodRows.length,
    totalPrints: sumPrints(paidPeriodRows),
    totalRevenue: sumRevenue(paidPeriodRows),
    qrisTotal,
    qrisPaid,
    qrisFailed,
    qrisSuccessRate,
    paymentMethods: buildPaymentBreakdown(paidPeriodRows),
    topFrames: buildTopFrames(paidPeriodRows),
    revenueSeries: series,
  };
}

function buildPaymentBreakdown(rows: EventTransactionRow[]) {
  const totals = new Map<string, EventBreakdownItem>();

  for (const row of rows) {
    const label = normalizeProvider(row.provider);
    const current = totals.get(label) ?? {
      label,
      value: 0,
      revenue: 0,
      sessions: 0,
      prints: 0,
    };
    current.value += safeAmount(row.amount);
    current.revenue += safeAmount(row.amount);
    current.sessions += 1;
    current.prints += safePrintCount(row.print_count);
    totals.set(label, current);
  }

  return Array.from(totals.values()).sort((a, b) => b.revenue - a.revenue);
}

function buildTopFrames(rows: EventTransactionRow[]) {
  const totals = new Map<string, EventBreakdownItem>();

  for (const row of rows) {
    const label = resolveTemplateName(row);
    const current = totals.get(label) ?? {
      label,
      value: 0,
      revenue: 0,
      sessions: 0,
      prints: 0,
    };
    current.value += 1;
    current.revenue += safeAmount(row.amount);
    current.sessions += 1;
    current.prints += safePrintCount(row.print_count);
    totals.set(label, current);
  }

  return Array.from(totals.values())
    .sort((a, b) => b.sessions - a.sessions || b.prints - a.prints)
    .slice(0, 5);
}

function buildDailySeries(rows: EventTransactionRow[], startOfDay: Date) {
  return Array.from({ length: 6 }, (_, index) => {
    const bucketStart = new Date(startOfDay.getTime() + index * 4 * HOUR_MS);
    const bucketEnd = new Date(bucketStart.getTime() + 4 * HOUR_MS);
    const bucketRows = rows.filter((row) => {
      const createdAt = new Date(row.created_at).getTime();
      return createdAt >= bucketStart.getTime() && createdAt < bucketEnd.getTime();
    });

    return {
      label: `${String(index * 4).padStart(2, "0")}:00`,
      revenue: sumRevenue(bucketRows),
      sessions: bucketRows.length,
      prints: sumPrints(bucketRows),
    };
  });
}

function buildWeeklySeries(rows: EventTransactionRow[], now: Date) {
  const todayParts = getJakartaDateParts(now);
  const todayCalendarUtc = Date.UTC(
    todayParts.year,
    todayParts.month - 1,
    todayParts.day,
  );
  const startCalendarUtc = todayCalendarUtc - 6 * DAY_MS;

  return Array.from({ length: 7 }, (_, index) => {
    const calendarDate = new Date(startCalendarUtc + index * DAY_MS);
    const start = jakartaDateToUtcDate({
      year: calendarDate.getUTCFullYear(),
      month: calendarDate.getUTCMonth() + 1,
      day: calendarDate.getUTCDate(),
    });
    const end = new Date(start.getTime() + DAY_MS);
    const bucketRows = rows.filter((row) => {
      const createdAt = new Date(row.created_at).getTime();
      return createdAt >= start.getTime() && createdAt < end.getTime();
    });

    return {
      label: formatJakartaDate(start, { weekday: "short" }),
      revenue: sumRevenue(bucketRows),
      sessions: bucketRows.length,
      prints: sumPrints(bucketRows),
    };
  });
}

function buildMonthlySeries(rows: EventTransactionRow[], now: Date) {
  const starts = getJakartaPeriodStarts(now);
  return Array.from({ length: 5 }, (_, index) => {
    const bucketStart = new Date(starts.monthly.getTime() + index * 7 * DAY_MS);
    const bucketEnd = new Date(bucketStart.getTime() + 7 * DAY_MS);
    const bucketRows = rows.filter((row) => {
      const createdAt = new Date(row.created_at).getTime();
      return createdAt >= bucketStart.getTime() && createdAt < bucketEnd.getTime();
    });

    return {
      label: `W${index + 1}`,
      revenue: sumRevenue(bucketRows),
      sessions: bucketRows.length,
      prints: sumPrints(bucketRows),
    };
  });
}

function getJakartaPeriodStarts(now: Date) {
  const parts = getJakartaDateParts(now);
  const daily = jakartaDateToUtcDate(parts);
  const calendarUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
  const dayOfWeek = new Date(calendarUtc).getUTCDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weeklyCalendarUtc = calendarUtc - daysSinceMonday * DAY_MS;
  const weeklyDate = new Date(weeklyCalendarUtc);

  return {
    daily,
    weekly: jakartaDateToUtcDate({
      year: weeklyDate.getUTCFullYear(),
      month: weeklyDate.getUTCMonth() + 1,
      day: weeklyDate.getUTCDate(),
    }),
    monthly: jakartaDateToUtcDate({
      year: parts.year,
      month: parts.month,
      day: 1,
    }),
  };
}

function getJakartaDateParts(date: Date): DateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
  };
}

function jakartaDateToUtcDate(parts: DateParts) {
  const year = String(parts.year).padStart(4, "0");
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return new Date(`${year}-${month}-${day}T00:00:00+07:00`);
}

function formatJakartaDate(
  date: Date,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: JAKARTA_TIME_ZONE,
    ...options,
  }).format(date);
}

function sumRevenue(rows: EventTransactionRow[]) {
  return rows.reduce((sum, row) => sum + safeAmount(row.amount), 0);
}

function sumPrints(rows: EventTransactionRow[]) {
  return rows.reduce((sum, row) => sum + safePrintCount(row.print_count), 0);
}

function safeAmount(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function safePrintCount(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeProvider(provider: string | null) {
  const normalized = provider?.trim();
  if (!normalized) return "Unknown";
  if (normalized.toLowerCase() === "qris") return "QRIS";
  if (normalized.toLowerCase() === "voucher") return "Voucher";
  if (normalized.toLowerCase() === "cash") return "Cash";
  return normalized;
}

function resolveTemplateName(row: EventTransactionRow) {
  const templates = row.templates;
  const template = Array.isArray(templates) ? templates[0] : templates;
  const name = template?.name?.trim();
  if (name) return name;
  if (row.template_id?.trim()) return row.template_id.trim();
  return "Tanpa frame";
}

function createEmptyEventStatistics(): EventStatisticsData {
  const generatedAt = new Date(0).toISOString();
  const emptyPeriod = (
    key: EventPeriodKey,
    label: string,
  ): EventPeriodStatistics => ({
    key,
    label,
    startsAt: generatedAt,
    totalSessions: 0,
    totalPrints: 0,
    totalRevenue: 0,
    qrisTotal: 0,
    qrisPaid: 0,
    qrisFailed: 0,
    qrisSuccessRate: 0,
    paymentMethods: [],
    topFrames: [],
    revenueSeries: [],
  });

  return {
    generatedAt,
    periods: {
      daily: emptyPeriod("daily", "Harian"),
      weekly: emptyPeriod("weekly", "Mingguan"),
      monthly: emptyPeriod("monthly", "Bulanan"),
    },
  };
}
