import type { ChartPoint, KpiMetric } from "@/types/analytics";
import type { Booth } from "@/types/booth";
import type { PricingProduct } from "@/types/pricing";
import type { Template } from "@/types/template";
import type { Tenant } from "@/types/tenant";
import type { ThemePreset } from "@/types/theme";
import type { Transaction } from "@/types/transaction";

export const kpiMetrics: KpiMetric[] = [
  { label: "Revenue today", value: "Rp 4.820.000", delta: "+18.4%", tone: "positive" },
  { label: "Revenue this month", value: "Rp 128.6jt", delta: "+12.8%", tone: "positive" },
  { label: "Transactions today", value: "326", delta: "+41 orders", tone: "positive" },
  { label: "QRIS success rate", value: "98.7%", delta: "0.4% failed", tone: "neutral" },
];

export const weeklyChart: ChartPoint[] = [
  { label: "Mon", revenue: 3200000, transactions: 198, downloads: 120 },
  { label: "Tue", revenue: 4100000, transactions: 244, downloads: 162 },
  { label: "Wed", revenue: 3700000, transactions: 226, downloads: 151 },
  { label: "Thu", revenue: 5200000, transactions: 309, downloads: 219 },
  { label: "Fri", revenue: 6100000, transactions: 354, downloads: 258 },
  { label: "Sat", revenue: 8900000, transactions: 512, downloads: 389 },
  { label: "Sun", revenue: 7600000, transactions: 438, downloads: 332 },
];

export const monthlyChart: ChartPoint[] = [
  { label: "Jan", revenue: 73000000, transactions: 4012 },
  { label: "Feb", revenue: 82000000, transactions: 4421 },
  { label: "Mar", revenue: 91000000, transactions: 5029 },
  { label: "Apr", revenue: 103000000, transactions: 5684 },
  { label: "May", revenue: 128600000, transactions: 6942 },
];

export const transactions: Transaction[] = [
  { id: "TRX-9251", booth: "Booth 01", location: "PVJ Bandung", customer: "Raka", packageName: "Double Print", amount: 10000, status: "paid", provider: "QRIS", createdAt: "2 min ago" },
  { id: "TRX-9250", booth: "Booth 03", location: "Cihampelas Walk", customer: "Nadya", packageName: "Single Print", amount: 7000, status: "pending", provider: "QRIS", createdAt: "6 min ago" },
  { id: "TRX-9249", booth: "Booth 02", location: "Braga Citywalk", customer: "Faris", packageName: "Double Print", amount: 10000, status: "paid", provider: "QRIS", createdAt: "8 min ago" },
  { id: "TRX-9248", booth: "Booth 04", location: "Festival Citylink", customer: "Mira", packageName: "GIF Bundle", amount: 15000, status: "failed", provider: "QRIS", createdAt: "14 min ago" },
  { id: "TRX-9247", booth: "Booth 01", location: "PVJ Bandung", customer: "Dimas", packageName: "Single Print", amount: 7000, status: "paid", provider: "QRIS", createdAt: "21 min ago" },
];

export const booths: Booth[] = [
  { id: "BTH-01", name: "Booth 01", location: "PVJ Bandung", status: "online", battery: 88, appVersion: "2.7.1", lastSync: "30 sec ago", theme: "Mono Receipt", template: "Classic Receipt", pricingProfile: "Bandung Standard" },
  { id: "BTH-02", name: "Booth 02", location: "Braga Citywalk", status: "online", battery: 72, appVersion: "2.7.1", lastSync: "1 min ago", theme: "Navy Premium", template: "Postcard Night", pricingProfile: "Weekend Promo" },
  { id: "BTH-03", name: "Booth 03", location: "Cihampelas Walk", status: "maintenance", battery: 41, appVersion: "2.6.9", lastSync: "19 min ago", theme: "POSKART Red", template: "Seasonal Stamp", pricingProfile: "Opening Promo" },
  { id: "BTH-04", name: "Booth 04", location: "Festival Citylink", status: "offline", battery: 12, appVersion: "2.6.8", lastSync: "2 hours ago", theme: "Mono Receipt", template: "Classic Receipt", pricingProfile: "Bandung Standard" },
];

export const templates: Template[] = [
  { id: "TPL-01", name: "Classic Receipt", category: "receipt", status: "published", assignedBooths: 14, updatedAt: "Today" },
  { id: "TPL-02", name: "Postcard Night", category: "postcard", status: "published", assignedBooths: 6, updatedAt: "Yesterday" },
  { id: "TPL-03", name: "Seasonal Stamp", category: "seasonal", status: "draft", assignedBooths: 0, updatedAt: "2 days ago" },
  { id: "TPL-04", name: "Wedding Frame", category: "event", status: "published", assignedBooths: 3, updatedAt: "4 days ago" },
];

export const pricingProducts: PricingProduct[] = [
  { id: "PRC-01", name: "Single Print", price: 7000, printLimit: 1, qrisDownload: true, gifEnabled: false, active: true },
  { id: "PRC-02", name: "Double Print", price: 10000, promoPrice: 9000, printLimit: 2, qrisDownload: true, gifEnabled: false, active: true },
  { id: "PRC-03", name: "GIF Bundle", price: 15000, printLimit: 2, qrisDownload: true, gifEnabled: true, active: true },
];

export const tenants: Tenant[] = [
  { id: "TNT-01", name: "POSKART Bandung", plan: "Enterprise", status: "active", booths: 18, users: 12, renewalDate: "2026-06-30" },
  { id: "TNT-02", name: "POSKART Jakarta", plan: "Growth", status: "trial", booths: 6, users: 5, renewalDate: "2026-06-12" },
  { id: "TNT-03", name: "Event Partner", plan: "Starter", status: "paused", booths: 2, users: 3, renewalDate: "2026-05-31" },
];

export const themePresets: ThemePreset[] = [
  {
    id: "THM-01",
    name: "Mono Receipt",
    status: "published",
    schema: {
      version: 1,
      colors: { background: "#ffffff", foreground: "#18181b", accent: "#ef4444", muted: "#f4f4f5" },
      typography: { heading: "Geist", body: "Geist", receipt: "Geist Mono" },
      radius: { card: 8, button: 6, receipt: 2 },
      shadows: { card: "0 12px 35px rgba(24,24,27,0.08)" },
      assets: {},
      animationPreset: "premium",
    },
  },
  {
    id: "THM-02",
    name: "Navy Premium",
    status: "draft",
    schema: {
      version: 1,
      colors: { background: "#f8fafc", foreground: "#0f172a", accent: "#1d4ed8", muted: "#e2e8f0" },
      typography: { heading: "Geist", body: "Geist", receipt: "Geist Mono" },
      radius: { card: 8, button: 6, receipt: 4 },
      shadows: { card: "0 16px 45px rgba(15,23,42,0.10)" },
      assets: {},
      animationPreset: "subtle",
    },
  },
];

export const assets = [
  { id: "AST-01", name: "poskart-logo.svg", folder: "Logos", tag: "brand", version: "v3", size: "84 KB" },
  { id: "AST-02", name: "receipt-stamp-red.png", folder: "Stamps", tag: "stamp", version: "v7", size: "312 KB" },
  { id: "AST-03", name: "grain-texture.webp", folder: "Backgrounds", tag: "texture", version: "v2", size: "1.2 MB" },
  { id: "AST-04", name: "festival-frame.png", folder: "Frames", tag: "event", version: "v1", size: "920 KB" },
];
