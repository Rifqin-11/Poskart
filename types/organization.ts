export type Organization = {
  id: string;
  name: string;
  plan: "Free" | "1 Month" | "3 Months" | "6 Months" | "1 Year" | string;
  status: "active" | "trial" | "paused";
  devices: number;
  users: number;
  renewalDate: string;
  planId?: string;
  subscriptionStatus?: string;
  subscriptionExpiresAt?: string | null;
  deviceLimit?: number;
  features?: {
    posKasir: boolean;
    money: boolean;
  };
};
