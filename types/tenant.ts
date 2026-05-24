export type Tenant = {
  id: string;
  name: string;
  plan: "Starter" | "Growth" | "Enterprise";
  status: "active" | "trial" | "paused";
  booths: number;
  users: number;
  renewalDate: string;
};
