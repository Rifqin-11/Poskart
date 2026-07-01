"use server";

import { getAdminContext } from "@/server/admin/context";
import { createClient } from "@/lib/supabase/server";
import { getTransactions } from "./transaction-actions";
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
  type PosDashboardSummary,
  type PosDashboardSaleRow,
  type RawTransactionRow,
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

async function getKpiMetrics(): Promise<KpiMetric[]> {
  try {
    const supabase = await createClient();

    // Get user's organization for filtering
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) return [];

    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("profile_id", userId)
      .limit(1)
      .maybeSingle();

    const organizationId = membership?.organization_id;

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).toISOString();
    const startOfThisMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).toISOString();
    const startOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    ).toISOString();
    const endOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    ).toISOString();

    let query = supabase
      .from("transactions")
      .select("id,amount,status,provider,created_at");
    if (organizationId) query = query.eq("organization_id", organizationId);

    const { data: allTx } = await query;
    const rows = (allTx ?? []) as RawTransactionRow[];

    const todayRows = rows.filter((r) => r.created_at >= startOfToday);
    const monthRows = rows.filter((r) => r.created_at >= startOfThisMonth);
    const lastMonthRows = rows.filter(
      (r) => r.created_at >= startOfLastMonth && r.created_at <= endOfLastMonth,
    );

    const paidRows = rows.filter((r) => r.status === "paid");
    const todayRevenue = todayRows
      .filter((r) => r.status === "paid")
      .reduce((sum, r) => sum + r.amount, 0);
    const monthRevenue = monthRows
      .filter((r) => r.status === "paid")
      .reduce((sum, r) => sum + r.amount, 0);
    const lastMonthRevenue = lastMonthRows
      .filter((r) => r.status === "paid")
      .reduce((sum, r) => sum + r.amount, 0);
    const todayCount = todayRows.length;

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
    const qrisRows = rows.filter((r) => r.provider === "QRIS");
    const qrisSuccess = qrisRows.filter((r) => r.status === "paid").length;
    const qrisRate =
      qrisRows.length > 0
        ? ((qrisSuccess / qrisRows.length) * 100).toFixed(1)
        : "0.0";
    const qrisFailed = qrisRows.length - qrisSuccess;
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
          todayRows.length > 0
            ? `${todayRows.length} transactions`
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
          paidRows.length > 0
            ? `${paidRows.length} paid total`
            : "Waiting for first session",
        tone: todayCount > 0 ? "positive" : "neutral",
      },
      {
        label: "QRIS success rate",
        value: `${qrisRate}%`,
        delta:
          qrisRows.length > 0
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

async function getChartPoints(
  period: "weekly" | "monthly",
): Promise<ChartPoint[]> {
  try {
    const supabase = await createClient();

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) return [];

    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("profile_id", userId)
      .limit(1)
      .maybeSingle();

    const organizationId = membership?.organization_id;

    const now = new Date();

    if (period === "weekly") {
      // Last 7 days grouped by day
      const cutoff = new Date(now);
      cutoff.setDate(now.getDate() - 6);
      cutoff.setHours(0, 0, 0, 0);

      let query = supabase
        .from("transactions")
        .select("amount,status,created_at")
        .gte("created_at", cutoff.toISOString());
      if (organizationId) query = query.eq("organization_id", organizationId);

      const { data } = await query;
      const rows = (data ?? []) as {
        amount: number;
        status: string;
        created_at: string;
      }[];

      return Array.from({ length: 7 }, (_, i) => {
        const day = new Date(now);
        day.setDate(now.getDate() - (6 - i));
        const dayLabel = new Intl.DateTimeFormat("id-ID", {
          weekday: "short",
        }).format(day);
        const dayStart = new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate(),
        );
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayStart.getDate() + 1);

        const dayRows = rows.filter((r) => {
          const d = new Date(r.created_at);
          return d >= dayStart && d < dayEnd;
        });

        return {
          label: dayLabel,
          revenue: dayRows
            .filter((r) => r.status === "paid")
            .reduce((s, r) => s + r.amount, 0),
          transactions: dayRows.length,
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
      const cutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1);

      let query = supabase
        .from("transactions")
        .select("amount,status,created_at")
        .gte("created_at", cutoff.toISOString());
      if (organizationId) query = query.eq("organization_id", organizationId);

      const { data } = await query;
      const rows = (data ?? []) as {
        amount: number;
        status: string;
        created_at: string;
      }[];

      return Array.from({ length: 6 }, (_, i) => {
        const month = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const nextMonth = new Date(
          now.getFullYear(),
          now.getMonth() - (5 - i) + 1,
          1,
        );

        const monthRows = rows.filter((r) => {
          const d = new Date(r.created_at);
          return d >= month && d < nextMonth;
        });

        return {
          label: monthNames[month.getMonth()],
          revenue: monthRows
            .filter((r) => r.status === "paid")
            .reduce((s, r) => s + r.amount, 0),
          transactions: monthRows.length,
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
    const supabase = await createClient();

    // Resolve current user's organization for explicit filtering
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) return EMPTY_POS_SUMMARY;

    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("profile_id", userId)
      .limit(1)
      .maybeSingle();

    const organizationId = membership?.organization_id;

    let queryBuilder = supabase
      .from("pos_sales")
      .select(
        "id,package_name,print_count,amount,payment_method,notes,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(1000);

    // Always filter by org when available — do not rely solely on RLS
    if (organizationId) {
      queryBuilder = queryBuilder.eq("organization_id", organizationId);
    }

    const { data, error } = await queryBuilder;
    if (error) {
      console.error("[getPosDashboardSummary]", error.message);
      return EMPTY_POS_SUMMARY;
    }

    const sales = (data ?? []) as PosDashboardSaleRow[];

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const currencyDateFormatter = new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const weekdayFormatter = new Intl.DateTimeFormat("id-ID", {
      weekday: "short",
    });

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.amount, 0);
    const totalPrints = sales.reduce((sum, sale) => sum + sale.print_count, 0);
    const todaySales = sales.filter(
      (sale) => new Date(sale.created_at) >= startOfToday,
    );
    const monthlySales = sales.filter(
      (sale) => new Date(sale.created_at) >= startOfMonth,
    );

    const packageTotals = new Map<
      string,
      { transactions: number; revenue: number; prints: number }
    >();
    const paymentTotals = new Map<
      "Cash" | "QRIS",
      { transactions: number; revenue: number }
    >();

    for (const sale of sales) {
      const packageTotal = packageTotals.get(sale.package_name) ?? {
        transactions: 0,
        revenue: 0,
        prints: 0,
      };
      packageTotal.transactions += 1;
      packageTotal.revenue += sale.amount;
      packageTotal.prints += sale.print_count;
      packageTotals.set(sale.package_name, packageTotal);

      const paymentTotal = paymentTotals.get(sale.payment_method) ?? {
        transactions: 0,
        revenue: 0,
      };
      paymentTotal.transactions += 1;
      paymentTotal.revenue += sale.amount;
      paymentTotals.set(sale.payment_method, paymentTotal);
    }

    const dailySales = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - index));
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      const dayStart = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );
      const dayEnd = new Date(
        nextDate.getFullYear(),
        nextDate.getMonth(),
        nextDate.getDate(),
      );
      const daySales = sales.filter((sale) => {
        const createdAt = new Date(sale.created_at);
        return createdAt >= dayStart && createdAt < dayEnd;
      });

      return {
        label: weekdayFormatter.format(dayStart),
        revenue: daySales.reduce((sum, sale) => sum + sale.amount, 0),
        transactions: daySales.length,
      };
    });

    return {
      totalRevenue,
      todayRevenue: todaySales.reduce((sum, sale) => sum + sale.amount, 0),
      monthlyRevenue: monthlySales.reduce((sum, sale) => sum + sale.amount, 0),
      totalTransactions: sales.length,
      todayTransactions: todaySales.length,
      totalPrints,
      averageTransaction:
        sales.length > 0 ? Math.round(totalRevenue / sales.length) : 0,
      topPackages: Array.from(packageTotals.entries())
        .map(([name, total]) => ({ name, ...total }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
      paymentBreakdown: Array.from(paymentTotals.entries()).map(
        ([method, total]) => ({
          method,
          ...total,
        }),
      ),
      dailySales,
      recentSales: sales.slice(0, 5).map((sale) => ({
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

async function getCurrentUserOrganizationId() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) return { supabase, organizationId: null };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", userId)
    .limit(1)
    .maybeSingle();

  return {
    supabase,
    organizationId: membership?.organization_id ?? null,
  };
}

async function getDashboardEventStatistics() {
  try {
    const { supabase, organizationId } = await getCurrentUserOrganizationId();
    if (!organizationId) return EMPTY_EVENT_STATISTICS;
    return await getEventStatisticsForOrganization(supabase, organizationId);
  } catch (err) {
    console.error("[getDashboardEventStatistics]", err);
    return EMPTY_EVENT_STATISTICS;
  }
}

export async function getDashboard(): Promise<DashboardData> {
  const [
    kpiResult,
    weeklyResult,
    monthlyResult,
    transactionsResult,
    devicesResult,
    posSummaryResult,
    eventStatsResult,
  ] = await Promise.allSettled([
    getKpiMetrics(),
    getChartPoints("weekly"),
    getChartPoints("monthly"),
    getTransactions(),
    getDevices(),
    getPosDashboardSummary(),
    getDashboardEventStatistics(),
  ]);

  if (kpiResult.status === "rejected")
    console.error("[getDashboard] kpiMetrics failed:", kpiResult.reason);
  if (weeklyResult.status === "rejected")
    console.error("[getDashboard] weeklyChart failed:", weeklyResult.reason);
  if (monthlyResult.status === "rejected")
    console.error("[getDashboard] monthlyChart failed:", monthlyResult.reason);
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
    console.error(
      "[getDashboard] eventStats failed:",
      eventStatsResult.reason,
    );

  return {
    kpiMetrics: kpiResult.status === "fulfilled" ? kpiResult.value : [],
    weeklyChart: weeklyResult.status === "fulfilled" ? weeklyResult.value : [],
    monthlyChart:
      monthlyResult.status === "fulfilled" ? monthlyResult.value : [],
    transactions:
      transactionsResult.status === "fulfilled" ? transactionsResult.value : [],
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
  planId: string | null;
  planName: string;
  deviceLimit: number;
}> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) {
    return {
      tier: "Free",
      expiry: null,
      planId: null,
      planName: "Free",
      deviceLimit: 1,
    };
  }

  const { data: profile } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", userData.user.id)
    .limit(1)
    .single();

  if (!profile?.organization_id) {
    return {
      tier: "Free",
      expiry: null,
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
    .eq("organization_id", profile.organization_id)
    .maybeSingle();

  const planMeta = subscriptionPlanMeta(sub);
  const planName = subscriptionDisplayName(sub);
  const deviceLimit = sub?.device_limit ?? planMeta?.included_devices ?? 1;

  if (isSubscriptionActive(sub)) {
    const expiryTime = subscriptionExpiryTime(sub);
    return {
      tier: "Pro",
      expiry: new Date(expiryTime).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      planId: sub?.plan_id ?? null,
      planName,
      deviceLimit,
    };
  }

  return {
    tier: "Free",
    expiry: null,
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
