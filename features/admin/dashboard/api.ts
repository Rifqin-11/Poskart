import { dashboardService } from "@/server/admin/dashboard-service";
import { subscriptionService } from "@/server/subscription/subscription-service";
import type {
  DashboardData,
  Device,
  EventBreakdownItem,
  EventPeriodKey,
  EventPeriodStatistics,
  KpiMetric,
  Transaction,
} from "@/server/admin/_shared/admin-types";

export const dashboardApi = {
  getDashboard: dashboardService.getDashboard,
  getSubscriptionStatus: subscriptionService.getStatus,
};

export type {
  DashboardData,
  Device,
  EventBreakdownItem,
  EventPeriodKey,
  EventPeriodStatistics,
  KpiMetric,
  Transaction,
};
