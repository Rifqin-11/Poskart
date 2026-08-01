export const adminQueryKeys = {
  dashboard: ["dashboard"] as const,
  posSalesRoot: ["pos-sales"] as const,
  posSales: (filters: Record<string, unknown>) =>
    ["pos-sales", filters] as const,
  transactionsRoot: ["transactions"] as const,
  transactions: (filters: Record<string, unknown> = {}) =>
    ["transactions", filters] as const,
  payoutSummary: ["payout-summary"] as const,
  payoutInvoices: ["payout-invoices"] as const,
  transactionActionRequestsRoot: ["transaction-action-requests"] as const,
  transactionActionRequests: (page = 1, pageSize = 10) =>
    ["transaction-action-requests", { page, pageSize }] as const,
  adminNotifications: ["admin-notifications"] as const,
  failedPrints: (boothName?: string | null) =>
    ["failed-prints", boothName ?? null] as const,
  devices: ["devices"] as const,
  deviceErrors: (deviceId?: string | null) =>
    ["device-errors", deviceId ?? null] as const,
  superAdminDeviceErrors: ["superadmin-device-errors"] as const,
  superAdminNotifications: ["superadmin-notifications"] as const,
  vouchers: ["vouchers"] as const,
  templates: ["templates"] as const,
  showcases: ["showcases"] as const,
  frameCategories: ["frame-categories"] as const,
  pricing: ["pricing"] as const,
  organizations: ["organizations"] as const,
  themes: ["themes"] as const,
  assets: ["assets"] as const,
  appConfig: ["app-config"] as const,
  layoutSchema: ["layout-schema", "default-photobooth"] as const,
  layoutSchemas: ["layout-schemas"] as const,
  activeThemeStatistics: (themeName?: string | null) =>
    ["active-theme-statistics", themeName ?? null] as const,
  subscriptionPlans: ["subscription-plans"] as const,
  subscriptionStatus: ["subscription-status"] as const,
  subscriptionOrders: ["subscription-orders"] as const,
  profiles: ["profiles"] as const,
  organizationDetails: ["organization-details"] as const,
  organizationPaymentGateway: ["organization-payment-gateway"] as const,
  organizationMembers: ["organization-members"] as const,
  organizationInvitations: ["organization-invitations"] as const,
  organizationJoinRequests: ["organization-join-requests"] as const,
  trialRequestsRoot: ["trial-requests"] as const,
  trialRequests: (filters: Record<string, unknown> = {}) =>
    ["trial-requests", filters] as const,
  myTrialRequest: ["my-trial-request"] as const,
};
