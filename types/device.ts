export type Device = {
  id: string;
  name: string;
  location: string;
  status: "online" | "offline" | "maintenance";
  battery: number;
  appVersion: string;
  lastSync: string;
  /** Stable per-device layout identity. `theme` remains a display snapshot. */
  layoutSchemaId?: string | null;
  theme: string;
  template: string;
  pricingProfile: string;
  frameTemplates: string[];
  /** Whether the kiosk shows frame category tabs above the template grid. */
  frameCategoriesEnabled: boolean;
  pricingProfiles: string[];
  /** Per-device override for the in-session photo countdown (seconds).
   *  When null, the Flutter app falls back to the global `app_configs` value. */
  sessionCountdownSeconds?: number | null;
  /** Per-device override for the QRIS payment countdown (seconds). */
  paymentCountdownSeconds?: number | null;
  /** Enables voucher redemption in the kiosk payment method sheet. */
  voucherEnabled: boolean;
  /** Enables the reserved TEST voucher for local-only test sessions. */
  testVoucherEnabled: boolean;
  /** Whether opening Settings on the kiosk requires its device PIN. */
  protectSettings: boolean;
  printerStatus:
    | "ready"
    | "disconnected"
    | "permission_required"
    | "paper_out"
    | "error"
    | "unknown";
  printerName?: string | null;
  printerLastError?: string | null;
  printerStatusUpdatedAt?: string | null;
  printerBidirectional: boolean;
  printerBottomSafeZoneMm: number;
  printerBrightness: number;
  printerContrast: number;
  printerDotDensity: number;
  voucherRequestedAt?: string | null;
  voucherCommand?: string | null;
  voucherCommandUpdatedAt?: string | null;
  unresolvedErrorCount?: number;
};
