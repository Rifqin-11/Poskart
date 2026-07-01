import { subscriptionService } from "@/server/subscription/subscription-service";

export const subscriptionApi = {
  getStatus: subscriptionService.getStatus,
  getOrders: subscriptionService.getOrders,
  updateOrderStatus: subscriptionService.updateOrderStatus,
};
