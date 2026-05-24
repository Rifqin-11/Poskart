export type Tenant = {
  id: string;
  name: string;
  plan: "Monthly" | "3 Months" | "1 Year" | "Starter" | "Growth" | "Enterprise";
  status: "active" | "trial" | "paused";
  booths: number;
  users: number;
  renewalDate: string;
};
