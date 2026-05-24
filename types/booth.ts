export type Booth = {
  id: string;
  name: string;
  location: string;
  status: "online" | "offline" | "maintenance";
  battery: number;
  appVersion: string;
  lastSync: string;
  theme: string;
  template: string;
  pricingProfile: string;
  /** Per-booth override for the in-session photo countdown (seconds).
   *  When null, the Flutter app falls back to the global `app_configs` value. */
  sessionCountdownSeconds?: number | null;
  /** Per-booth override for the QRIS payment countdown (seconds). */
  paymentCountdownSeconds?: number | null;
};
