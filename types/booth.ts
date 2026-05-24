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
};
