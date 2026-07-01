import { pricingService } from "@/server/admin/pricing-service";
import type {
  PricingProductInput,
  SubscriptionPlanInput,
} from "@/server/admin/_shared/admin-types";

export const pricingApi = {
  getPricingProducts: pricingService.getPricingProducts,
  createPricingProduct: pricingService.createPricingProduct,
  updatePricingProduct: pricingService.updatePricingProduct,
  deletePricingProduct: pricingService.deletePricingProduct,
  getSubscriptionPlans: pricingService.getSubscriptionPlans,
  updateSubscriptionPlan: pricingService.updateSubscriptionPlan,
};

export type { PricingProductInput, SubscriptionPlanInput };
