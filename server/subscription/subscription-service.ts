import { adminRepository } from "@/server/admin/_shared/admin-repository";

export const subscriptionService = {
  getStatus: adminRepository.getSubscriptionStatus,
  getOrders: adminRepository.getSubscriptionOrders,
  updateOrderStatus: adminRepository.updateSubscriptionOrderStatus,
  getPlans: adminRepository.subscriptionPlans,
  updatePlan: adminRepository.updateSubscriptionPlan,
};
