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
import { Activity, ArrowUpRight, CircleDollarSign, Download, LayoutTemplate, MonitorCheck, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardData, useSubscriptionStatus } from "@/hooks/use-admin-data";
import { formatCurrency } from "@/lib/utils";

const icons = [CircleDollarSign, CircleDollarSign, Activity, Download];

const emptyMetrics = [
  { label: "Revenue today", value: "Rp 0", delta: "No transactions yet", tone: "neutral" as const },
  { label: "Revenue this month", value: "Rp 0", delta: "No monthly data yet", tone: "neutral" as const },
  { label: "Transactions today", value: "0", delta: "Waiting for first session", tone: "neutral" as const },
  { label: "Downloads", value: "0", delta: "No media downloads yet", tone: "neutral" as const },
];

function useClientMounted() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

export function DashboardOverview() {
  const { data, isLoading } = useDashboardData();
  const { data: subscription } = useSubscriptionStatus();
  const chartsMounted = useClientMounted();

  if (isLoading || !data) {
    return <Skeleton className="h-[620px]" />;
  }

  const activeBooths = data.devices.filter((device) => device.status === "online").length;
  const metrics = data.kpiMetrics.length > 0 ? data.kpiMetrics : emptyMetrics;
  const hasWeeklyChart = data.weeklyChart.length > 0;
  const hasMonthlyChart = data.monthlyChart.length > 0;
  const hasDevices = data.devices.length > 0;
  const hasTransactions = data.transactions.length > 0;
  const isEmptyWorkspace =
    !hasDevices && !hasTransactions && !hasWeeklyChart && !hasMonthlyChart;
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
                  : "Activate a subscription to unlock templates, builder, devices, assets, transactions, analytics, and settings."}
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
                <Link href="/billing" className={buttonVariants()}>
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

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Weekly revenue</CardTitle>
            <CardDescription>Revenue, transactions, and media download movement.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {chartsMounted && hasWeeklyChart ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.weeklyChart}>
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
            <CardDescription>{activeBooths} of {data.devices.length} devices online now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasDevices ? (
              data.devices.map((device) => (
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
                href={canUseOperatingTools ? "/devices" : "/billing"}
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
                <BarChart data={data.monthlyChart}>
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
              data.transactions.map((transaction) => (
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
                href={canUseOperatingTools ? "/devices" : "/billing"}
                action={canUseOperatingTools ? "Connect device" : "Activate subscription"}
              />
            )}
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
