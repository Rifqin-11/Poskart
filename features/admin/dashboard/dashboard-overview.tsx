"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useSyncExternalStore } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, AlertCircle, ArrowUpRight, CircleDollarSign, Download, LayoutTemplate, MonitorCheck, Plus, Printer, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardData, useSubscriptionStatus } from "@/features/admin/dashboard/use-dashboard";
import type { DashboardData } from "@/server/admin/_shared/admin-repository";
import { formatCurrency } from "@/lib/utils";

const icons = [CircleDollarSign, CircleDollarSign, Activity, Download];

const emptyMetrics = [
  { label: "Revenue today", value: "Rp 0", delta: "No transactions yet", tone: "neutral" as const },
  { label: "Revenue this month", value: "Rp 0", delta: "No monthly data yet", tone: "neutral" as const },
  { label: "Transactions today", value: "0", delta: "Waiting for first session", tone: "neutral" as const },
  { label: "Downloads", value: "0", delta: "No media downloads yet", tone: "neutral" as const },
];

const emptyDashboardData: DashboardData = {
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
};

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

  if (isLoading) {
    return <DashboardLoadingState />;
  }

  const dashboardData = data ?? emptyDashboardData;
  const activeBooths = dashboardData.devices.filter((device) => device.status === "online").length;
  const metrics = dashboardData.kpiMetrics.length > 0 ? dashboardData.kpiMetrics : emptyMetrics;
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
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard Overview</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Real-time operating view for all POSKART photobooth kiosks.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={!canUseOperatingTools}>Export report</Button>
          <Button disabled={!canUseOperatingTools}>New campaign</Button>
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
        {metrics.map((metric, index) => {
          const Icon = icons[index] ?? Activity;
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium text-zinc-500">{metric.label}</CardTitle>
                  <Icon className="size-4 text-zinc-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold tracking-tight">{metric.value}</div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                    <ArrowUpRight className="size-3" />
                    {metric.delta}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>POS Kasir hari ini</CardTitle>
            <CardDescription>
              Data transaksi manual dari halaman POS Kasir.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
              <CircleDollarSign className="mb-3 size-4 text-zinc-500" />
              <div className="text-xs text-zinc-500">Pendapatan hari ini</div>
              <div className="mt-1 text-xl font-semibold tracking-tight">
                {formatCurrency(dashboardData.posSummary.todayRevenue)}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
              <ReceiptText className="mb-3 size-4 text-zinc-500" />
              <div className="text-xs text-zinc-500">Transaksi hari ini</div>
              <div className="mt-1 text-xl font-semibold tracking-tight">
                {dashboardData.posSummary.todayTransactions}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
              <Printer className="mb-3 size-4 text-zinc-500" />
              <div className="text-xs text-zinc-500">Total print</div>
              <div className="mt-1 text-xl font-semibold tracking-tight">
                {dashboardData.posSummary.totalPrints}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Riwayat POS terbaru</CardTitle>
              <CardDescription>
                Penjualan paket print terakhir dari kasir.
              </CardDescription>
            </div>
            <Link href="/pos" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Buka POS
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasPosSales ? (
              dashboardData.posSummary.recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between rounded-lg border border-zinc-100 p-3">
                  <div>
                    <div className="text-sm font-medium">{sale.packageName}</div>
                    <div className="text-xs text-zinc-500">
                      {sale.printCount} print · {sale.paymentMethod} · {sale.createdAt}
                    </div>
                  </div>
                  <div className="text-right text-sm font-semibold">
                    {formatCurrency(sale.amount)}
                  </div>
                </div>
              ))
            ) : (
              <EmptyPanelState
                title="Belum ada transaksi POS"
                description="Simpan transaksi dari POS Kasir agar ringkasan pendapatan, paket, dan print muncul di dashboard."
                href="/pos"
                action="Buka POS Kasir"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Weekly revenue</CardTitle>
            <CardDescription>Revenue, transactions, and media download movement.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {chartsMounted && hasWeeklyChart ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardData.weeklyChart}>
                  <defs>
                    <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#18181b" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(value) => `${Number(value) / 1000000}jt`} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Area type="monotone" dataKey="revenue" stroke="#18181b" fill="url(#revenue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : hasWeeklyChart ? (
              <Skeleton className="h-full" />
            ) : (
              <EmptyChartState
                title="No weekly revenue yet"
                description="Revenue movement appears after the first paid kiosk transaction."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Device network</CardTitle>
            <CardDescription>{activeBooths} of {dashboardData.devices.length} devices online now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasDevices ? (
              dashboardData.devices.map((device) => (
                <div key={device.id} className="rounded-lg border border-zinc-100 p-3">
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
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Monthly graph</CardTitle>
            <CardDescription>Growth trend across active organizations.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {chartsMounted && hasMonthlyChart ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.monthlyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="revenue" fill="#18181b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : hasMonthlyChart ? (
              <Skeleton className="h-full" />
            ) : (
              <EmptyChartState
                title="No monthly analytics yet"
                description="Monthly growth appears after POSKART records transactions over time."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Real-time transaction feed</CardTitle>
              <CardDescription>Latest QRIS and kiosk payment activity.</CardDescription>
            </div>
            <Badge variant="outline">Live</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasTransactions ? (
              dashboardData.transactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between rounded-lg border border-zinc-100 p-3">
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
        {Array.from({ length: 4 }).map((_, index) => (
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
            {Array.from({ length: 3 }).map((_, index) => (
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
