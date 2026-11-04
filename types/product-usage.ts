export const PRODUCT_USAGE_EVENT_NAMES = [
  "page_viewed",
  "signup_completed",
  "trial_started",
  "onboarding_completed",
  "device_pairing_started",
  "device_pairing_success",
  "device_pairing_failed",
  "pricing_viewed",
  "checkout_started",
  "first_transaction_created",
] as const;

export type ProductUsageEventName =
  (typeof PRODUCT_USAGE_EVENT_NAMES)[number];

export const PRODUCT_USAGE_SOURCES = [
  "auth",
  "admin",
  "onboarding",
  "billing",
  "kiosk",
] as const;

export type ProductUsageSource = (typeof PRODUCT_USAGE_SOURCES)[number];

export type ProductUsageMetadata = Record<
  string,
  string | number | boolean | null
>;

export type ProductUsageEventInput = {
  eventName: ProductUsageEventName;
  pagePath?: string | null;
  sessionId?: string | null;
  source?: ProductUsageSource;
  success?: boolean | null;
  errorCode?: string | null;
  metadata?: Record<string, unknown>;
};

export type ProductUsageFunnel = {
  registered: number;
  trialStarted: number;
  onboardingCompleted: number;
  devicePairingSuccess: number;
  checkoutStarted: number;
  firstTransactionCreated: number;
  activeOrganizations: number;
};

export type ProductUsagePage = {
  pagePath: string;
  uniqueOrganizations: number;
  totalViews: number;
};

export type ProductUsagePairingError = {
  errorCode: string;
  organizations: number;
  attempts: number;
};

export type SuperAdminProductUsageAnalytics = {
  range: {
    from: string;
    to: string;
  };
  funnel: ProductUsageFunnel;
  pageUsage: ProductUsagePage[];
  pairingErrors: ProductUsagePairingError[];
};
