import { adminRepository } from "@/server/admin/_shared/admin-repository";

export const pricingService = {
  getPricingProducts: adminRepository.pricing,
  createPricingProduct: adminRepository.createPricingProduct,
  updatePricingProduct: adminRepository.updatePricingProduct,
  deletePricingProduct: adminRepository.deletePricingProduct,
  getSubscriptionPlans: adminRepository.subscriptionPlans,
  updateSubscriptionPlan: adminRepository.updateSubscriptionPlan,
};
