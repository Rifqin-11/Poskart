import {
  assets,
  booths,
  kpiMetrics,
  monthlyChart,
  pricingProducts,
  templates,
  tenants,
  themePresets,
  transactions,
  weeklyChart,
} from "@/lib/mock-data/admin-data";

const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

export const adminService = {
  async dashboard() {
    await delay();
    return { kpiMetrics, weeklyChart, monthlyChart, transactions, booths };
  },
  async transactions() {
    await delay();
    return transactions;
  },
  async booths() {
    await delay();
    return booths;
  },
  async templates() {
    await delay();
    return templates;
  },
  async pricing() {
    await delay();
    return pricingProducts;
  },
  async tenants() {
    await delay();
    return tenants;
  },
  async themes() {
    await delay();
    return themePresets;
  },
  async assets() {
    await delay();
    return assets;
  },
};
