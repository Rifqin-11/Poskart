import { dashboardService } from "@/server/admin/dashboard-service";
import { subscriptionService } from "@/server/subscription/subscription-service";
import { getMyTrialRequest } from "@/server/admin/actions/trial-actions";
import type {
  DashboardData,
  DashboardTransactionStat,
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
  getMyTrialRequest,
};

export type {
  DashboardData,
  DashboardTransactionStat,
  Device,
  EventBreakdownItem,
  EventPeriodKey,
  EventPeriodStatistics,
  KpiMetric,
  Transaction,
};
