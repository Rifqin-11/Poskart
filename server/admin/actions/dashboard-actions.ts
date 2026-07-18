"use server";

import {
  getAdminContext,
  getAdminMembership,
} from "@/server/admin/context";
import { cache } from "react";
import { getDevices } from "./device-actions";
import {
  EMPTY_EVENT_STATISTICS,
  getEventStatisticsForOrganization,
} from "../event-statistics";
import {
  subscriptionExpiryTime,
  subscriptionPlanMeta,
  subscriptionDisplayName,
  isSubscriptionActive,
  type DashboardData,
  type KpiMetric,
  type ChartPoint,
  type DashboardTransactionStat,
  type PosDashboardSummary,
  type PosDashboardSaleRow,
  type PosDashboardStatRow,
  type TransactionRow,
  TRANSACTION_COLUMNS,
  mapTransaction,
} from "../_shared/admin-types";

const EMPTY_POS_SUMMARY: PosDashboardSummary = {
  totalRevenue: 0,
  todayRevenue: 0,
  monthlyRevenue: 0,
  totalTransactions: 0,
  todayTransactions: 0,
  totalPrints: 0,
  averageTransaction: 0,
  topPackages: [],
  paymentBreakdown: [],
  dailySales: [],
  recentSales: [],
};

const getDashboardScope = cache(async () => {
  const [{ supabase }, membership] = await Promise.all([
    getAdminContext(),
    getAdminMembership(),
  ]);

  return {
    supabase,
    organizationId: membership?.organizationId ?? null,
  };
});

type DashboardTransactionStatRow = {
  period_day: string;
  provider: string | null;
  package_name: string | null;
  transaction_count: number | string | null;
  paid_count: number | string | null;
  print_count: number | string | null;
  gross_revenue: number | string | null;
};

type DashboardTransactionFallbackRow = {
  amount: number | string | null;
  status: string | null;
  provider: string | null;
  package_name: string | null;
  created_at: string;
  print_count: number | null;
  paid_at: string | null;
};

const jakartaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getJakartaDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = jakartaDateFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

function getMonthKey(dateKey: string) {
  return dateKey.slice(0, 7);
}

function mapDashboardTransactionStat(
  row: DashboardTransactionStatRow,
): DashboardTransactionStat {
  return {
    periodDay: row.period_day,
    provider: row.provider || "Unknown",
    packageName: row.package_name || "No package",
    transactionCount: Number(row.transaction_count ?? 0),
    paidCount: Number(row.paid_count ?? 0),
    printCount: Number(row.print_count ?? 0),
    grossRevenue: Number(row.gross_revenue ?? 0),
  };
}

function aggregateDashboardFallbackRows(
  rows: DashboardTransactionFallbackRow[],
): DashboardTransactionStat[] {
  const totals = new Map<string, DashboardTransactionStat>();

  for (const row of rows) {
    const periodDay = getJakartaDateKey(row.created_at);
    const provider = row.provider || "Unknown";
    const packageName = row.package_name?.trim() || "No package";
    const key = `${periodDay}\u0000${provider}\u0000${packageName}`;
    const current = totals.get(key) ?? {
      periodDay,
      provider,
      packageName,
      transactionCount: 0,
      paidCount: 0,
      printCount: 0,
      grossRevenue: 0,
    };
    const isPaid = row.status === "paid" || Boolean(row.paid_at);

    current.transactionCount += 1;
    if (isPaid) {
      current.paidCount += 1;
      current.printCount += Number(row.print_count ?? 0);
      current.grossRevenue += Number(row.amount ?? 0);
    }
    totals.set(key, current);
  }

  return Array.from(totals.values()).sort((a, b) =>
    b.periodDay.localeCompare(a.periodDay),
  );
}

const getDashboardTransactionStats = cache(
  async (): Promise<DashboardTransactionStat[]> => {
    const { supabase, organizationId } = await getDashboardScope();
    if (!organizationId) return [];

    const { data, error } = await supabase.rpc(
      "get_dashboard_transaction_stats",
    );
    if (!error) {
      return ((data ?? []) as DashboardTransactionStatRow[]).map(
        mapDashboardTransactionStat,
      );
    }

    // Keep the dashboard usable while a new migration is being deployed. The
    // fallback is bounded; the RPC remains the production path for all history.
    if (error.code !== "PGRST202" && error.code !== "42883") {
      throw new Error(`Unable to load dashboard statistics: ${error.message}`);
    }

    const cutoff = new Date();
    cutoff.setUTCMonth(cutoff.getUTCMonth() - 13, 1);
    cutoff.setUTCHours(0, 0, 0, 0);
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("transactions")
      .select(
        "amount,status,provider,package_name,created_at,print_count,paid_at",
      )
      .eq("organization_id", organizationId)
      .is("archived_at", null)
      .is("archive_reason", null)
      .or("payout_status.is.null,payout_status.neq.testing")
      .neq("provider", "Event")
      .or(
        "provider.neq.QRIS,status.neq.pending,merchant_order_id.not.is.null",
      )
      .gte("created_at", cutoff.toISOString());

    if (fallbackError) {
      throw new Error(
        `Unable to load dashboard fallback statistics: ${fallbackError.message}`,
      );
    }

    return aggregateDashboardFallbackRows(
      (fallbackData ?? []) as DashboardTransactionFallbackRow[],
    );
  },
);

const getRecentDashboardTransactions = cache(async () => {
  const { supabase, organizationId } = await getDashboardScope();
  if (!organizationId) return [];

  const { data, error } = await supabase
    .from("transactions")
    .select(TRANSACTION_COLUMNS)
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .is("archive_reason", null)
    .or("payout_status.is.null,payout_status.neq.testing")
    .neq("provider", "Event")
    .or("provider.neq.QRIS,status.neq.pending,merchant_order_id.not.is.null")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(`Unable to load recent transactions: ${error.message}`);
  }

  return ((data ?? []) as TransactionRow[]).map(mapTransaction);
});

function getKpiMetrics(stats: DashboardTransactionStat[]): KpiMetric[] {
  try {
    const todayKey = getJakartaDateKey(new Date());
    const thisMonthKey = getMonthKey(todayKey);
    const [year, month] = thisMonthKey.split("-").map(Number);
    const lastMonthKey = `${month === 1 ? year - 1 : year}-${String(
      month === 1 ? 12 : month - 1,
    ).padStart(2, "0")}`;

    const todayRows = stats.filter((row) => row.periodDay === todayKey);
    const monthRows = stats.filter(
      (row) => getMonthKey(row.periodDay) === thisMonthKey,
    );
    const lastMonthRows = stats.filter(
      (row) => getMonthKey(row.periodDay) === lastMonthKey,
    );
    const paidCount = stats.reduce((sum, row) => sum + row.paidCount, 0);
    const todayRevenue = todayRows.reduce(
      (sum, row) => sum + row.grossRevenue,
      0,
    );
    const monthRevenue = monthRows.reduce(
      (sum, row) => sum + row.grossRevenue,
      0,
    );
    const lastMonthRevenue = lastMonthRows.reduce(
      (sum, row) => sum + row.grossRevenue,
      0,
    );
    const todayCount = todayRows.reduce(
      (sum, row) => sum + row.transactionCount,
      0,
    );

    // Monthly revenue delta
    const monthDelta =
      lastMonthRevenue > 0
        ? Math.round(
            ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100,
          )
        : 0;
    const monthDeltaStr =
      monthDelta >= 0
        ? `+${monthDelta}% vs last month`
        : `${monthDelta}% vs last month`;
    const monthTone: KpiMetric["tone"] =
      monthDelta >= 0 ? "positive" : "warning";

    // QRIS success rate
    const qrisRows = stats.filter((row) => row.provider === "QRIS");
    const qrisTotal = qrisRows.reduce(
      (sum, row) => sum + row.transactionCount,
      0,
    );
    const qrisSuccess = qrisRows.reduce(
      (sum, row) => sum + row.paidCount,
      0,
    );
    const qrisRate =
      qrisTotal > 0
        ? ((qrisSuccess / qrisTotal) * 100).toFixed(1)
        : "0.0";
    const qrisFailed = qrisTotal - qrisSuccess;
    const qrisTone: KpiMetric["tone"] =
      Number(qrisRate) >= 90
        ? "positive"
        : Number(qrisRate) >= 70
          ? "warning"
          : "warning";

    const formatRp = (n: number) => {
      if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
      if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
      return `Rp ${n.toLocaleString("id-ID")}`;
    };

    return [
      {
        label: "Revenue today",
        value: formatRp(todayRevenue),
        delta:
          todayCount > 0
            ? `${todayCount} transactions`
            : "No transactions yet",
        tone: todayRevenue > 0 ? "positive" : "neutral",
      },
      {
        label: "Revenue this month",
        value: formatRp(monthRevenue),
        delta: monthDeltaStr,
        tone: monthTone,
      },
      {
        label: "Transactions today",
        value: String(todayCount),
        delta:
          paidCount > 0
            ? `${paidCount} paid total`
            : "Waiting for first session",
        tone: todayCount > 0 ? "positive" : "neutral",
      },
      {
        label: "QRIS success rate",
        value: `${qrisRate}%`,
        delta:
          qrisTotal > 0
            ? `${qrisFailed} failed QRIS`
            : "No QRIS transactions yet",
        tone: qrisTone,
      },
    ];
  } catch (err) {
    console.error("[getKpiMetrics]", err);
    return [];
  }
}

function getChartPoints(
  period: "weekly" | "monthly",
  stats: DashboardTransactionStat[],
): ChartPoint[] {
  try {
    const now = new Date();

    if (period === "weekly") {
      return Array.from({ length: 7 }, (_, i) => {
        const day = new Date(now);
        day.setUTCDate(now.getUTCDate() - (6 - i));
        const dayKey = getJakartaDateKey(day);
        const dayLabel = new Intl.DateTimeFormat("id-ID", {
          weekday: "short",
          timeZone: "Asia/Jakarta",
        }).format(day);
        const dayRows = stats.filter((row) => row.periodDay === dayKey);

        return {
          label: dayLabel,
          revenue: dayRows.reduce((sum, row) => sum + row.grossRevenue, 0),
          transactions: dayRows.reduce(
            (sum, row) => sum + row.transactionCount,
            0,
          ),
        };
      });
    } else {
      // Last 6 months
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "Mei",
        "Jun",
        "Jul",
        "Agu",
        "Sep",
        "Okt",
        "Nov",
        "Des",
      ];
      const currentDateKey = getJakartaDateKey(now);
      const [currentYear, currentMonth] = currentDateKey
        .slice(0, 7)
        .split("-")
        .map(Number);

      return Array.from({ length: 6 }, (_, i) => {
        const monthDate = new Date(
          Date.UTC(currentYear, currentMonth - 1 - (5 - i), 1),
        );
        const monthKey = `${monthDate.getUTCFullYear()}-${String(
          monthDate.getUTCMonth() + 1,
        ).padStart(2, "0")}`;
        const monthRows = stats.filter(
          (row) => getMonthKey(row.periodDay) === monthKey,
        );

        return {
          label: monthNames[monthDate.getUTCMonth()],
          revenue: monthRows.reduce(
            (sum, row) => sum + row.grossRevenue,
            0,
          ),
          transactions: monthRows.reduce(
            (sum, row) => sum + row.transactionCount,
            0,
          ),
        };
      });
    }
  } catch (err) {
    console.error("[getChartPoints]", err);
    return [];
  }
}

async function getPosDashboardSummary(): Promise<PosDashboardSummary> {
  try {
    const { supabase, organizationId } = await getDashboardScope();
    const [{ data: statsData, error: statsError }, recentResult] =
      await Promise.all([
        supabase.rpc("get_pos_dashboard_stats"),
        (() => {
          let recentQuery = supabase
            .from("pos_sales")
            .select(
              "id,package_name,print_count,amount,payment_method,notes,created_at",
            )
            .order("created_at", { ascending: false })
            .limit(5);
          if (organizationId) {
            recentQuery = recentQuery.eq("organization_id", organizationId);
          }
          return recentQuery;
        })(),
      ]);

    if (statsError) {
      console.error("[getPosDashboardSummary] stats", statsError.message);
      return EMPTY_POS_SUMMARY;
    }
    if (recentResult.error) {
      console.error(
        "[getPosDashboardSummary] recent",
        recentResult.error.message,
      );
      return EMPTY_POS_SUMMARY;
    }

    const stats = (statsData ?? []) as PosDashboardStatRow[];
    const recentSales = (recentResult.data ?? []) as PosDashboardSaleRow[];
    const now = new Date();
    const todayKey = getJakartaDateKey(now);
    const monthKey = todayKey.slice(0, 7);
    const currencyDateFormatter = new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    });
    const weekdayFormatter = new Intl.DateTimeFormat("id-ID", {
      weekday: "short",
      timeZone: "Asia/Jakarta",
    });
    const normalizedStats = stats.map((row) => ({
      periodDay: row.period_day,
      packageName: row.package_name,
      paymentMethod: row.payment_method,
      transactions: Number(row.transaction_count) || 0,
      prints: Number(row.print_count) || 0,
      revenue: Number(row.revenue) || 0,
    }));

    const totalRevenue = normalizedStats.reduce(
      (sum, row) => sum + row.revenue,
      0,
    );
    const totalTransactions = normalizedStats.reduce(
      (sum, row) => sum + row.transactions,
      0,
    );
    const totalPrints = normalizedStats.reduce(
      (sum, row) => sum + row.prints,
      0,
    );
    const todayStats = normalizedStats.filter(
      (row) => row.periodDay === todayKey,
    );
    const monthlyStats = normalizedStats.filter((row) =>
      row.periodDay.startsWith(monthKey),
    );
    const packageTotals = new Map<
      string,
      { transactions: number; revenue: number; prints: number }
    >();
    const paymentTotals = new Map<
      "Cash" | "QRIS",
      { transactions: number; revenue: number }
    >();

    for (const row of normalizedStats) {
      const packageTotal = packageTotals.get(row.packageName) ?? {
        transactions: 0,
        revenue: 0,
        prints: 0,
      };
      packageTotal.transactions += row.transactions;
      packageTotal.revenue += row.revenue;
      packageTotal.prints += row.prints;
      packageTotals.set(row.packageName, packageTotal);

      const paymentTotal = paymentTotals.get(row.paymentMethod) ?? {
        transactions: 0,
        revenue: 0,
      };
      paymentTotal.transactions += row.transactions;
      paymentTotal.revenue += row.revenue;
      paymentTotals.set(row.paymentMethod, paymentTotal);
    }

    const dailySales = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(now);
      day.setUTCDate(day.getUTCDate() - (6 - index));
      const dayKey = getJakartaDateKey(day);
      const dayStats = normalizedStats.filter(
        (row) => row.periodDay === dayKey,
      );

      return {
        label: weekdayFormatter.format(day),
        revenue: dayStats.reduce((sum, row) => sum + row.revenue, 0),
        transactions: dayStats.reduce(
          (sum, row) => sum + row.transactions,
          0,
        ),
      };
    });

    return {
      totalRevenue,
      todayRevenue: todayStats.reduce((sum, row) => sum + row.revenue, 0),
      monthlyRevenue: monthlyStats.reduce((sum, row) => sum + row.revenue, 0),
      totalTransactions,
      todayTransactions: todayStats.reduce(
        (sum, row) => sum + row.transactions,
        0,
      ),
      totalPrints,
      averageTransaction:
        totalTransactions > 0
          ? Math.round(totalRevenue / totalTransactions)
          : 0,
      topPackages: Array.from(packageTotals.entries())
        .map(([name, total]) => ({ name, ...total }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
      paymentBreakdown: Array.from(paymentTotals.entries()).map(
        ([method, total]) => ({ method, ...total }),
      ),
      dailySales,
      recentSales: recentSales.map((sale) => ({
        id: sale.id,
        packageName: sale.package_name,
        printCount: sale.print_count,
        amount: sale.amount,
        paymentMethod: sale.payment_method,
        notes: sale.notes,
        createdAt: currencyDateFormatter.format(new Date(sale.created_at)),
      })),
    };

  } catch (err) {
    console.error("[getPosDashboardSummary] Unexpected error:", err);
    return EMPTY_POS_SUMMARY;
  }
}

async function getDashboardEventStatistics() {
  try {
    const { supabase, organizationId } = await getDashboardScope();
    if (!organizationId) return EMPTY_EVENT_STATISTICS;
    return await getEventStatisticsForOrganization(supabase, organizationId);
  } catch (err) {
    console.error("[getDashboardEventStatistics]", err);
    return EMPTY_EVENT_STATISTICS;
  }
}

export async function getDashboard(): Promise<DashboardData> {
  const [
    transactionStatsResult,
    transactionsResult,
    devicesResult,
    posSummaryResult,
    eventStatsResult,
  ] = await Promise.allSettled([
    getDashboardTransactionStats(),
    getRecentDashboardTransactions(),
    getDevices(),
    getPosDashboardSummary(),
    getDashboardEventStatistics(),
  ]);

  if (transactionStatsResult.status === "rejected")
    console.error(
      "[getDashboard] transactionStats failed:",
      transactionStatsResult.reason,
    );
  if (transactionsResult.status === "rejected")
    console.error(
      "[getDashboard] transactions failed:",
      transactionsResult.reason,
    );
  if (devicesResult.status === "rejected")
    console.error("[getDashboard] devices failed:", devicesResult.reason);
  if (posSummaryResult.status === "rejected")
    console.error("[getDashboard] posSummary failed:", posSummaryResult.reason);
  if (eventStatsResult.status === "rejected")
    console.error("[getDashboard] eventStats failed:", eventStatsResult.reason);

  const transactionStats =
    transactionStatsResult.status === "fulfilled"
      ? transactionStatsResult.value
      : [];

  return {
    kpiMetrics: getKpiMetrics(transactionStats),
    weeklyChart: getChartPoints("weekly", transactionStats),
    monthlyChart: getChartPoints("monthly", transactionStats),
    transactionStats,
    transactions:
      transactionsResult.status === "fulfilled"
        ? transactionsResult.value
        : [],
    devices: devicesResult.status === "fulfilled" ? devicesResult.value : [],
    posSummary:
      posSummaryResult.status === "fulfilled"
        ? posSummaryResult.value
        : EMPTY_POS_SUMMARY,
    eventStats:
      eventStatsResult.status === "fulfilled"
        ? eventStatsResult.value
        : EMPTY_EVENT_STATISTICS,
  };
}

export async function getSubscriptionStatus(): Promise<{
  tier: "Free" | "Pro";
  expiry: string | null;
  isActive: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
  planId: string | null;
  planName: string;
  deviceLimit: number;
}> {
  const { supabase, organizationId } = await getDashboardScope();
  if (!organizationId) {
    return {
      tier: "Free",
      expiry: null,
      isActive: false,
      status: null,
      currentPeriodEnd: null,
      planId: null,
      planName: "Free",
      deviceLimit: 1,
    };
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select(
      `
      plan_id,
      status,
      device_limit,
      current_period_end,
      subscription_plans (
        name,
        included_devices
      )
    `,
    )
    .eq("organization_id", organizationId)
    .maybeSingle();

  const planMeta = subscriptionPlanMeta(sub);
  const planName = subscriptionDisplayName(sub);
  const deviceLimit = sub?.device_limit ?? planMeta?.included_devices ?? 1;
  const active = isSubscriptionActive(sub);

  if (active) {
    const expiryTime = subscriptionExpiryTime(sub);
    return {
      tier: "Pro",
      expiry: new Date(expiryTime).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      isActive: true,
      status: sub?.status ?? null,
      currentPeriodEnd: sub?.current_period_end ?? null,
      planId: sub?.plan_id ?? null,
      planName,
      deviceLimit,
    };
  }

  return {
    tier: "Free",
    expiry: null,
    isActive: false,
    status: sub?.status ?? null,
    currentPeriodEnd: sub?.current_period_end ?? null,
    planId: sub?.plan_id ?? null,
    planName,
    deviceLimit,
  };
}

export async function getSubscriptionOrders() {
  const { supabase } = await getAdminContext();
  const { data, error } = await supabase
    .from("subscription_orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateSubscriptionOrderStatus({
  id,
  status,
}: {
  id: string;
  status: "pending" | "paid" | "failed" | "cancelled";
}) {
  const { supabase } = await getAdminContext();
  const { data, error } = await supabase
    .from("subscription_orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
