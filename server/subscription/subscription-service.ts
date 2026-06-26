import {
  getSubscriptionStatus,
  getSubscriptionOrders,
  updateSubscriptionOrderStatus,
} from "@/server/admin/actions/dashboard-actions";
import {
  getSubscriptionPlans,
  updateSubscriptionPlan,
} from "@/server/admin/actions/pricing-actions";

export const subscriptionService = {
  getStatus: getSubscriptionStatus,
  getOrders: getSubscriptionOrders,
  updateOrderStatus: updateSubscriptionOrderStatus,
  getPlans: getSubscriptionPlans,
  updatePlan: updateSubscriptionPlan,
};
