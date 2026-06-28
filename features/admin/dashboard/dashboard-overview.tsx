"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState, useSyncExternalStore } from "react";
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
  ArrowUpRight,
  CircleDollarSign,
  Download,
  LayoutTemplate,
  MonitorCheck,
  Plus,
  Printer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  emptyDashboardData,
  emptyMetrics,
  eventPeriodTabs,
  pieColors,
} from "@/features/admin/dashboard/dashboard-overview.constants";
import { useDashboardData, useSubscriptionStatus } from "@/features/admin/dashboard/use-dashboard";
import type {
  Device,
  EventBreakdownItem,
  EventPeriodKey,
  EventPeriodStatistics,
  KpiMetric,
  Transaction,
} from "@/server/admin/_shared/admin-types";
import { cn, formatCurrency } from "@/lib/utils";

const dashboardInnerCardClass =
  "rounded-3xl border border-zinc-100 bg-white/90 shadow-sm shadow-zinc-200/60 backdrop-blur";
const dashboardSoftItemClass =
  "rounded-2xl border border-zinc-100 bg-white/85 shadow-sm shadow-zinc-100/70 backdrop-blur";

const hiddenDashboardMetricLabels = new Set([
  "Revenue today",
  "Revenue this month",
  "Transactions today",
]);

function getMetricIcon(metric: KpiMetric) {
  if (metric.label.toLowerCase().includes("qris")) return MonitorCheck;
  if (metric.label.toLowerCase().includes("download")) return Download;
  return Activity;
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

  if (isLoading) {
    return <DashboardLoadingState />;
  }

  const dashboardData = data ?? emptyDashboardData;
  const eventPeriod = dashboardData.eventStats.periods[selectedEventPeriod];
  const activeBooths = dashboardData.devices.filter((device: Device) => device.status === "online").length;
  const metrics = (
    dashboardData.kpiMetrics.length > 0 ? dashboardData.kpiMetrics : emptyMetrics
  ).filter((metric) => !hiddenDashboardMetricLabels.has(metric.label));
  const hasWeeklyChart = dashboardData.weeklyChart.length > 0;
  const hasMonthlyChart = dashboardData.monthlyChart.length > 0;
  const hasDevices = dashboardData.devices.length > 0;
  const hasTransactions = dashboardData.transactions.length > 0;
  const hasPosSales = dashboardData.posSummary.totalTransactions > 0;
  const isEmptyWorkspace =
    !hasDevices && !hasTransactions && !hasPosSales && !hasWeeklyChart && !hasMonthlyChart;
  const canUseOperatingTools = subscription?.tier === "Pro";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Statistik {eventPeriod.label}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Semua angka di bawah mengikuti tab periode yang dipilih.
          </p>
        </div>
        <PeriodTabs
          selectedPeriod={selectedEventPeriod}
          onSelectPeriod={setSelectedEventPeriod}
        />
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
                <Link href="/organization?subscription=required" className={buttonVariants()}>
                  <Plus className="size-4" />
                  Activate subscription
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric: KpiMetric, index: number) => {
          const Icon = getMetricIcon(metric);
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={dashboardInnerCardClass}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-zinc-500">
                        {metric.label}
                      </div>
                      <div className="mt-2 text-3xl font-semibold tracking-tight">
                        {metric.value}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-zinc-100 p-3 text-zinc-500">
                      <Icon className="size-5" />
                    </div>
                  </div>
                  <div className="mt-5 inline-flex items-center gap-1 rounded-2xl bg-zinc-50 px-3 py-2 text-xs text-emerald-600">
                    <ArrowUpRight className="size-3" />
                    {metric.delta}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
        <SummaryCard
          label="Total keuntungan"
          value={formatCurrency(eventPeriod.totalRevenue)}
          helper="Nominal transaksi paid"
          icon={CircleDollarSign}
          accent="bg-yellow-300"
        />
        <SummaryCard
          label="Total sesi"
          value={eventPeriod.totalSessions.toLocaleString("id-ID")}
          helper="Sesi booth berhasil dibayar"
          icon={Activity}
          accent="bg-violet-300"
        />
        <SummaryCard
          label="Total print"
          value={eventPeriod.totalPrints.toLocaleString("id-ID")}
          helper="Akumulasi print dari paket"
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
                href={canUseOperatingTools ? "/devices" : "/organization?subscription=required"}
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
            {hasTransactions ? (
              dashboardData.transactions.slice(0, 5).map((transaction: Transaction) => (
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
                href={canUseOperatingTools ? "/devices" : "/organization?subscription=required"}
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
  const topPaymentMethod = period.paymentMethods[0]?.label ?? "Belum ada";

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[1.25fr_0.75fr]">
      <div className="grid gap-4">
        <Card className={cn(dashboardInnerCardClass, "self-start")}>
          <CardHeader>
            <CardTitle>Tren pendapatan</CardTitle>
            <CardDescription>
              Pendapatan, sesi, dan print selama periode {period.label.toLowerCase()}.
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
                      tickFormatter={(value) => `${Number(value) / 1000}rb`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        name === "revenue"
                          ? formatCurrency(Number(value))
                          : Number(value).toLocaleString("id-ID"),
                        name === "revenue"
                          ? "Pendapatan"
                          : name === "sessions"
                            ? "Sesi"
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
                  title="Belum ada tren event"
                  description="Grafik muncul setelah booth mencatat transaksi paid."
                />
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 md:grid-cols-3">
          <MiniStatCard
            label="Rata-rata sesi"
            value={formatCurrency(averageRevenuePerSession)}
            helper="Revenue per sesi"
          />
          <MiniStatCard
            label="Print per sesi"
            value={printsPerSession.toFixed(1)}
            helper="Efisiensi paket print"
          />
          <MiniStatCard
            label="Metode utama"
            value={topPaymentMethod}
            helper="Pembayaran terbanyak"
          />
        </div>
      </div>

      <div className="grid gap-4">
        <EventPieCard
          chartsMounted={chartsMounted}
          title="Metode pembayaran"
          description="Distribusi pendapatan"
          items={period.paymentMethods}
          valueKey="revenue"
          valueFormatter={(value) => formatCurrency(value)}
        />
        <EventPieCard
          chartsMounted={chartsMounted}
          title="Frame terpakai"
          description="Top 5 berdasarkan sesi"
          items={period.topFrames}
          valueKey="sessions"
          valueFormatter={(value) => `${value.toLocaleString("id-ID")} sesi`}
        />
      </div>
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
    <div className="inline-flex w-fit rounded-2xl border border-zinc-200 bg-white/85 p-1 shadow-sm backdrop-blur">
      {eventPeriodTabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onSelectPeriod(tab.key)}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            selectedPeriod === tab.key
              ? "bg-zinc-950 text-white shadow-sm"
              : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function MiniStatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className={cn(dashboardSoftItemClass, "p-4")}>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-2 truncate text-xl font-semibold tracking-tight">
        {value}
      </div>
      <div className="mt-3 rounded-2xl bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
        {helper}
      </div>
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
            Belum ada data pada periode ini.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardLoadingState() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index: number) => (
          <Card key={index}>
            <CardHeader className="space-y-2 pb-2">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, index: number) => (
              <Skeleton key={index} className="h-20" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
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
    <div className="grid h-full place-items-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center">
      <div>
        <Activity className="mx-auto mb-3 size-6 text-zinc-300" />
        <div className="text-sm font-semibold text-zinc-700">{title}</div>
        <p className="mt-2 max-w-sm text-xs leading-5 text-zinc-500">
          {description}
        </p>
      </div>
    </div>
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
    <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-5 text-center">
      <MonitorCheck className="mx-auto mb-3 size-6 text-zinc-300" />
      <div className="text-sm font-semibold text-zinc-700">{title}</div>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-zinc-500">
        {description}
      </p>
      <Link
        href={href}
        className={buttonVariants({
          variant: "outline",
          size: "sm",
          className: "mt-4",
        })}
      >
        {action}
      </Link>
    </div>
  );
}
