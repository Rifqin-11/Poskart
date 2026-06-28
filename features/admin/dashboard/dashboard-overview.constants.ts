import type {
  DashboardData,
  EventPeriodKey,
  KpiMetric,
} from "@/server/admin/_shared/admin-types";

export const eventPeriodTabs: Array<{ key: EventPeriodKey; label: string }> = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

export const pieColors = [
  "#18181b",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
];

export const emptyMetrics: KpiMetric[] = [
  {
    label: "QRIS success rate",
    value: "0.0%",
    delta: "No QRIS transactions yet",
    tone: "neutral",
  },
  {
    label: "Downloads",
    value: "0",
    delta: "No media downloads yet",
    tone: "neutral",
  },
];

const emptyEventPeriod = (
  key: EventPeriodKey,
  label: string,
): DashboardData["eventStats"]["periods"][EventPeriodKey] => ({
  key,
  label,
  startsAt: new Date(0).toISOString(),
  totalSessions: 0,
  totalPrints: 0,
  totalRevenue: 0,
  paymentMethods: [],
  topFrames: [],
  revenueSeries: [],
});

export const emptyDashboardData: DashboardData = {
  kpiMetrics: [],
  weeklyChart: [],
  monthlyChart: [],
  transactions: [],
  devices: [],
  posSummary: {
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
  },
  eventStats: {
    generatedAt: new Date(0).toISOString(),
    periods: {
      daily: emptyEventPeriod("daily", "Harian"),
      weekly: emptyEventPeriod("weekly", "Mingguan"),
      monthly: emptyEventPeriod("monthly", "Bulanan"),
    },
  },
};
