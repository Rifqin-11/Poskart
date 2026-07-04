"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  Area,
  AreaChart,
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertCircle,
  CircleDollarSign,
  LayoutTemplate,
  MonitorCheck,
  Plus,
  Printer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/features/admin/_components/empty-state";
import { LoadingState } from "@/features/admin/_components/loading-state";
import { StatCard } from "@/features/admin/_components/stat-card";
import {
  emptyDashboardData,
  eventPeriodTabs,
  pieColors,
} from "@/features/admin/dashboard/dashboard-overview.constants";
import { useDashboardData, useSubscriptionStatus } from "@/features/admin/dashboard/use-dashboard";
import type {
  Device,
  EventBreakdownItem,
  EventPeriodKey,
  EventPeriodStatistics,
  Transaction,
} from "@/features/admin/dashboard/api";
import { cn, formatCurrency } from "@/lib/utils";

const dashboardInnerCardClass =
  "rounded-3xl border border-zinc-100 bg-white/90 shadow-sm shadow-zinc-200/60 backdrop-blur";
const dashboardSoftItemClass =
  "rounded-2xl border border-zinc-100 bg-white/85 shadow-sm shadow-zinc-100/70 backdrop-blur";

const dashboardMonthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

function getDashboardMonthKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getDashboardDateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDashboardMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  return dashboardMonthFormatter.format(new Date(year, month - 1, 1));
}

function buildMonthEventPeriod(
  monthKey: string,
  transactions: Transaction[],
): EventPeriodStatistics {
  const label =
    monthKey === "all" ? "Monthly" : formatDashboardMonthLabel(monthKey);
  const paidRows = transactions.filter(
    (transaction) => transaction.status === "paid",
  );
  const qrisRows = transactions.filter(
    (transaction) => transaction.provider === "QRIS",
  );
  const qrisPaid = qrisRows.filter(
    (transaction) => transaction.status === "paid",
  ).length;
  const paymentMethods = buildTransactionBreakdown(
    paidRows,
    (transaction) => transaction.provider,
  );
  const topFrames = buildTransactionBreakdown(
    paidRows,
    (transaction) => transaction.packageName || "No package",
  ).slice(0, 5);
  const revenueSeries = buildMonthRevenueSeries(monthKey, paidRows);

  return {
    key: "monthly",
    label,
    startsAt:
      monthKey === "all"
        ? new Date().toISOString()
        : new Date(`${monthKey}-01T00:00:00`).toISOString(),
    totalSessions: paidRows.length,
    totalPrints: paidRows.reduce(
      (sum, transaction) => sum + (transaction.printCount ?? 0),
      0,
    ),
    totalRevenue: paidRows.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    ),
    qrisTotal: qrisRows.length,
    qrisPaid,
    qrisFailed: qrisRows.length - qrisPaid,
    qrisSuccessRate: qrisRows.length > 0 ? (qrisPaid / qrisRows.length) * 100 : 0,
    paymentMethods,
    topFrames,
    revenueSeries,
  };
}

function buildTransactionBreakdown(
  transactions: Transaction[],
  getLabel: (transaction: Transaction) => string,
): EventBreakdownItem[] {
  const totals = new Map<string, EventBreakdownItem>();

  for (const transaction of transactions) {
    const label = getLabel(transaction);
    const current = totals.get(label) ?? {
      label,
      value: 0,
      revenue: 0,
      sessions: 0,
      prints: 0,
    };
    current.value += 1;
    current.revenue += transaction.amount;
    current.sessions += 1;
    current.prints += transaction.printCount ?? 0;
    totals.set(label, current);
  }

  return Array.from(totals.values()).sort((a, b) => b.revenue - a.revenue);
}

function buildMonthRevenueSeries(
  monthKey: string,
  transactions: Transaction[],
) {
  if (monthKey === "all") return [];
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return [];

  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const dayKey = `${monthKey}-${String(day).padStart(2, "0")}`;
    const dayTransactions = transactions.filter((transaction) =>
      getDashboardDateKey(transaction.createdAtRaw) === dayKey,
    );

    return {
      label: String(day),
      revenue: dayTransactions.reduce(
        (sum, transaction) => sum + transaction.amount,
        0,
      ),
      sessions: dayTransactions.length,
      prints: dayTransactions.reduce(
        (sum, transaction) => sum + (transaction.printCount ?? 0),
        0,
      ),
    };
  });
}

function useClientMounted() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

export function DashboardOverview() {
  const { data, isError, isLoading } = useDashboardData();
  const { data: subscription } = useSubscriptionStatus();
  const chartsMounted = useClientMounted();
  const [selectedEventPeriod, setSelectedEventPeriod] =
    useState<EventPeriodKey>("daily");
  const [selectedMonth, setSelectedMonth] = useState("all");

  const dashboardData = data ?? emptyDashboardData;
  const monthOptions = useMemo(
    () =>
      Array.from(
        new Set([
          getDashboardMonthKey(new Date().toISOString()),
          ...dashboardData.transactions
            .map((transaction) =>
              getDashboardMonthKey(transaction.createdAtRaw),
            )
            .filter(Boolean),
        ]),
      ).sort((a, b) => b.localeCompare(a)),
    [dashboardData.transactions],
  );
  const selectedMonthTransactions = useMemo(
    () =>
      selectedMonth === "all"
        ? dashboardData.transactions
        : dashboardData.transactions.filter(
            (transaction) =>
              getDashboardMonthKey(transaction.createdAtRaw) === selectedMonth,
          ),
    [dashboardData.transactions, selectedMonth],
  );
  const selectedMonthPeriod = useMemo(
    () => buildMonthEventPeriod(selectedMonth, selectedMonthTransactions),
    [selectedMonth, selectedMonthTransactions],
  );
  const eventPeriod =
    selectedMonth === "all"
      ? dashboardData.eventStats.periods[selectedEventPeriod]
      : selectedMonthPeriod;
  const feedTransactions =
    selectedMonth === "all"
      ? dashboardData.transactions
      : selectedMonthTransactions;
  const activeBooths = dashboardData.devices.filter((device: Device) => device.status === "online").length;
  const hasWeeklyChart = dashboardData.weeklyChart.length > 0;
  const hasMonthlyChart = dashboardData.monthlyChart.length > 0;
  const hasDevices = dashboardData.devices.length > 0;
  const hasTransactions = dashboardData.transactions.length > 0;
  const hasFeedTransactions = feedTransactions.length > 0;
  const hasPosSales = dashboardData.posSummary.totalTransactions > 0;
  const isEmptyWorkspace =
    !hasDevices && !hasTransactions && !hasPosSales && !hasWeeklyChart && !hasMonthlyChart;
  const canUseOperatingTools = Boolean(subscription?.isActive);

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {eventPeriod.label} Statistics
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            {selectedMonth === "all"
              ? "All numbers below follow the selected period tab."
              : "All numbers below are filtered by the selected month."}
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-3xl border border-zinc-200 bg-white/80 p-1.5 shadow-sm backdrop-blur sm:flex-row sm:items-center">
          <label className="min-w-[220px]">
            <span className="sr-only">Month</span>
            <Select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="h-11 w-full rounded-2xl border-zinc-100 bg-white px-4 text-sm font-medium text-zinc-900 shadow-none"
            >
              <option value="all">All periods</option>
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {formatDashboardMonthLabel(month)}
                </option>
              ))}
            </Select>
          </label>
          {selectedMonth === "all" ? (
            <PeriodTabs
              selectedPeriod={selectedEventPeriod}
              onSelectPeriod={setSelectedEventPeriod}
            />
          ) : null}
        </div>
      </div>

      {isError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <div className="font-semibold">Dashboard data is temporarily unavailable</div>
              <p className="mt-1 leading-6">
                POSKART will keep showing the workspace overview while the data source is being refreshed.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {isEmptyWorkspace ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
                <LayoutTemplate className="size-3.5 text-red-500" />
                New workspace
              </div>
              <h2 className="text-xl font-semibold tracking-tight">
                Your POSKART dashboard is ready.
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                No devices, transactions, or analytics have been recorded yet.
                {canUseOperatingTools
                  ? "Add your first device, create templates, and publish a builder layout to start collecting operational data."
                  : "Activate a subscription to unlock templates, builder, devices, transactions, analytics, and settings."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canUseOperatingTools ? (
                <>
                  <Link href="/templates" className={buttonVariants({ variant: "outline" })}>
                    <LayoutTemplate className="size-4" />
                    Create template
                  </Link>
                  <Link href="/devices" className={buttonVariants()}>
                    <Plus className="size-4" />
                    Add device
                  </Link>
                </>
              ) : (
                <Link href="/settings?tab=organization&subscription=required" className={buttonVariants()}>
                  <Plus className="size-4" />
                  Activate subscription
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="QRIS success rate"
          value={`${eventPeriod.qrisSuccessRate.toFixed(1)}%`}
          helper={
            eventPeriod.qrisTotal > 0
              ? `${eventPeriod.qrisFailed.toLocaleString("id-ID")} failed QRIS`
              : "No QRIS transactions yet"
          }
          icon={MonitorCheck}
          accent="bg-zinc-100"
        />
        <SummaryCard
          label="Total revenue"
          value={formatCurrency(eventPeriod.totalRevenue)}
          helper="Paid transaction amount"
          icon={CircleDollarSign}
          accent="bg-yellow-300"
        />
        <SummaryCard
          label="Total sessions"
          value={eventPeriod.totalSessions.toLocaleString("id-ID")}
          helper="Paid booth sessions"
          icon={Activity}
          accent="bg-violet-300"
        />
        <SummaryCard
          label="Total prints"
          value={eventPeriod.totalPrints.toLocaleString("id-ID")}
          helper="Accumulated prints from packages"
          icon={Printer}
          accent="bg-emerald-300"
        />
      </div>

      <EventAnalyticsSection
        chartsMounted={chartsMounted}
        period={eventPeriod}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className={dashboardInnerCardClass}>
          <CardHeader>
            <CardTitle>Device network</CardTitle>
            <CardDescription>{activeBooths} of {dashboardData.devices.length} devices online now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasDevices ? (
              dashboardData.devices.map((device: Device) => (
                <div key={device.id} className={cn(dashboardSoftItemClass, "p-3")}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{device.name}</div>
                      <div className="text-xs text-zinc-500">{device.location}</div>
                    </div>
                    <Badge
                      variant={
                        device.status === "online"
                          ? "success"
                          : device.status === "maintenance"
                            ? "warning"
                            : "destructive"
                      }
                    >
                      {device.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                    <MonitorCheck className="size-3" />
                    Battery {device.battery}% · Sync {device.lastSync}
                  </div>
                  <Progress value={device.battery} className="mt-3" />
                </div>
              ))
            ) : (
              <EmptyPanelState
                title="No devices connected"
                description="Add a POSKART device to monitor battery, sync, template, and pricing status."
                href={canUseOperatingTools ? "/devices" : "/settings?tab=organization&subscription=required"}
                action={canUseOperatingTools ? "Add device" : "Activate subscription"}
              />
            )}
          </CardContent>
        </Card>

        <Card className={dashboardInnerCardClass}>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Real-time transaction feed</CardTitle>
              <CardDescription>Latest QRIS and kiosk payment activity.</CardDescription>
            </div>
            <Badge variant="outline">Live</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasFeedTransactions ? (
              feedTransactions.slice(0, 5).map((transaction: Transaction) => (
                <div
                  key={transaction.id}
                  className={cn(
                    dashboardSoftItemClass,
                    "flex items-center justify-between p-3",
                  )}
                >
                  <div>
                    <div className="text-sm font-medium">{transaction.packageName}</div>
                    <div className="text-xs text-zinc-500">
                      {transaction.id} · {transaction.device} · {transaction.createdAt}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{formatCurrency(transaction.amount)}</div>
                    <Badge
                      variant={
                        transaction.status === "paid"
                          ? "success"
                          : transaction.status === "pending"
                            ? "warning"
                            : "destructive"
                      }
                    >
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <EmptyPanelState
                title="No transactions yet"
                description="QRIS payment activity and failed payment monitoring appear here after the first booth session."
                href={canUseOperatingTools ? "/devices" : "/settings?tab=organization&subscription=required"}
                action={canUseOperatingTools ? "Connect device" : "Activate subscription"}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EventAnalyticsSection({
  chartsMounted,
  period,
}: {
  chartsMounted: boolean;
  period: EventPeriodStatistics;
}) {
  const hasTrend = period.revenueSeries.length > 0;
  const averageRevenuePerSession =
    period.totalSessions > 0
      ? Math.round(period.totalRevenue / period.totalSessions)
      : 0;
  const printsPerSession =
    period.totalSessions > 0 ? period.totalPrints / period.totalSessions : 0;
  const topPaymentMethod = period.paymentMethods[0]?.label ?? "None yet";

  return (
    <div className="space-y-4">
      <div className="grid items-start gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className={cn(dashboardInnerCardClass, "self-start")}>
          <CardHeader>
            <CardTitle>Revenue trend</CardTitle>
            <CardDescription>
              Revenue, sessions, and prints during the {period.label.toLowerCase()} period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              {chartsMounted && hasTrend ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={period.revenueSeries}>
                    <defs>
                      <linearGradient
                        id={`eventRevenue-${period.key}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis
	                      tickFormatter={(value) => `${Number(value) / 1000}k`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        name === "revenue"
                          ? formatCurrency(Number(value))
                          : Number(value).toLocaleString("id-ID"),
                        name === "revenue"
                          ? "Revenue"
                          : name === "sessions"
                            ? "Sessions"
                            : "Print",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#8b5cf6"
                      fill={`url(#eventRevenue-${period.key})`}
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : hasTrend ? (
                <Skeleton className="h-full" />
              ) : (
                <EmptyChartState
                  title="No event trend yet"
                  description="Charts appear after the booth records paid transactions."
                />
              )}
            </div>
          </CardContent>
        </Card>

        <EventPieCard
          chartsMounted={chartsMounted}
          title="Payment methods"
          description="Revenue distribution"
          items={period.paymentMethods}
          valueKey="revenue"
          valueFormatter={(value) => formatCurrency(value)}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard
          title="Average session"
          value={formatCurrency(averageRevenuePerSession)}
          description="Revenue per session"
          icon={CircleDollarSign}
          className={dashboardSoftItemClass}
        />
        <StatCard
          title="Prints per session"
          value={printsPerSession.toFixed(1)}
          description="Print package efficiency"
          icon={Printer}
          className={dashboardSoftItemClass}
        />
        <StatCard
          title="Top method"
          value={topPaymentMethod}
          description="Most-used payment method"
          icon={Activity}
          className={dashboardSoftItemClass}
        />
      </div>

      <EventPieCard
        chartsMounted={chartsMounted}
        title="Used frames"
        description="Top 5 by session"
        items={period.topFrames}
        valueKey="sessions"
        valueFormatter={(value) => `${value.toLocaleString("id-ID")} sessions`}
      />
    </div>
  );
}

function PeriodTabs({
  selectedPeriod,
  onSelectPeriod,
}: {
  selectedPeriod: EventPeriodKey;
  onSelectPeriod: (period: EventPeriodKey) => void;
}) {
  return (
    <div className="inline-flex h-11 w-full rounded-2xl bg-zinc-50 p-1 sm:w-fit">
      {eventPeriodTabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onSelectPeriod(tab.key)}
          className={`h-9 flex-1 rounded-xl px-4 text-sm font-medium transition sm:flex-none ${
            selectedPeriod === tab.key
              ? "bg-zinc-950 text-white shadow-sm"
              : "text-zinc-500 hover:bg-white hover:text-zinc-900"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof Activity;
  accent: string;
}) {
  return (
    <div className={cn(dashboardInnerCardClass, "p-5")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-zinc-500">{label}</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight">
            {value}
          </div>
        </div>
        <div className={`rounded-2xl ${accent} p-3 text-zinc-950`}>
          <Icon className="size-5" />
        </div>
      </div>
      <div className="mt-5 rounded-2xl bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
        {helper}
      </div>
    </div>
  );
}

function EventPieCard({
  chartsMounted,
  title,
  description,
  items,
  valueKey,
  valueFormatter,
}: {
  chartsMounted: boolean;
  title: string;
  description: string;
  items: EventBreakdownItem[];
  valueKey: "revenue" | "sessions" | "prints";
  valueFormatter: (value: number) => string;
}) {
  const chartData = items
    .map((item) => ({
      name: item.label,
      value: Number(item[valueKey] ?? 0),
      revenue: item.revenue,
      sessions: item.sessions,
      prints: item.prints,
    }))
    .filter((item) => item.value > 0);
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className={dashboardInnerCardClass}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-[150px_1fr] xl:grid-cols-1 2xl:grid-cols-[150px_1fr]">
            <div className="h-36">
              {chartsMounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={66}
                      paddingAngle={3}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={pieColors[index % pieColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, _name, props) => [
                        valueFormatter(Number(value)),
                        props.payload?.name ?? title,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Skeleton className="h-full rounded-full" />
              )}
            </div>
            <div className="space-y-2">
              {chartData.map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-50 px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: pieColors[index % pieColors.length] }}
                    />
                    <span className="truncate font-medium">{item.name}</span>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {valueFormatter(item.value)}
                  </span>
                </div>
              ))}
              <div className="pt-1 text-xs text-zinc-400">
                Total: {valueFormatter(total)}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500">
            No data for this period yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyChartState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <EmptyState
      title={title}
      description={description}
      icon={Activity}
      className="grid h-full place-items-center p-6"
    />
  );
}

function EmptyPanelState({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <EmptyState
      title={title}
      description={description}
      icon={MonitorCheck}
      action={{ href, label: action }}
    />
  );
}
