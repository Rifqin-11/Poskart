import {
  getPricingProducts,
  createPricingProduct,
  updatePricingProduct,
  deletePricingProduct,
  getSubscriptionPlans,
  updateSubscriptionPlan,
} from "@/server/admin/actions/pricing-actions";

export const pricingService = {
  getPricingProducts,
  createPricingProduct,
  updatePricingProduct,
  deletePricingProduct,
  getSubscriptionPlans,
  updateSubscriptionPlan,
};
