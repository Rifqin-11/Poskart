"use client";

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
import { Activity, ArrowUpRight, CircleDollarSign, Download, MonitorCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardData } from "@/hooks/use-admin-data";
import { formatCurrency } from "@/lib/utils";

const icons = [CircleDollarSign, CircleDollarSign, Activity, Download];

function useClientMounted() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

export function DashboardOverview() {
  const { data, isLoading } = useDashboardData();
  const chartsMounted = useClientMounted();

  if (isLoading || !data) {
    return <Skeleton className="h-[620px]" />;
  }

  const activeBooths = data.booths.filter((booth) => booth.status === "online").length;

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
          <Button variant="outline">Export report</Button>
          <Button>New campaign</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.kpiMetrics.map((metric, index) => {
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
            {chartsMounted ? (
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
            ) : (
              <Skeleton className="h-full" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booth network</CardTitle>
            <CardDescription>{activeBooths} of {data.booths.length} booths online now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.booths.map((booth) => (
              <div key={booth.id} className="rounded-lg border border-zinc-100 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{booth.name}</div>
                    <div className="text-xs text-zinc-500">{booth.location}</div>
                  </div>
                  <Badge
                    variant={
                      booth.status === "online"
                        ? "success"
                        : booth.status === "maintenance"
                          ? "warning"
                          : "destructive"
                    }
                  >
                    {booth.status}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                  <MonitorCheck className="size-3" />
                  Battery {booth.battery}% · Sync {booth.lastSync}
                </div>
                <Progress value={booth.battery} className="mt-3" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Monthly graph</CardTitle>
            <CardDescription>Growth trend across active tenants.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {chartsMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="revenue" fill="#18181b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full" />
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
            {data.transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between rounded-lg border border-zinc-100 p-3">
                <div>
                  <div className="text-sm font-medium">{transaction.packageName}</div>
                  <div className="text-xs text-zinc-500">
                    {transaction.id} · {transaction.booth} · {transaction.createdAt}
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
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
