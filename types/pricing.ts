export type PricingProduct = {
  id: string;
  name: string;
  price: number;
  promoPrice?: number;
  printLimit: number;
  qrisDownload: boolean;
  livePhotoEnabled: boolean;
  gifEnabled: boolean;
  active: boolean;
};

export type PricingProductInput = Omit<PricingProduct, "id">;

export type SubscriptionPlan = {
  id: string;
  name: string;
  maxDevices: number;
  durationMonths: number;
  basePrice: number;
  includedDevices: number;
  additionalDevicePriceMonthly: number;
  isPublic: boolean;
  features: Record<string, unknown>;
};

export type SubscriptionPlanInput = Pick<
  SubscriptionPlan,
  | "name"
  | "durationMonths"
  | "basePrice"
  | "includedDevices"
  | "additionalDevicePriceMonthly"
  | "isPublic"
>;
