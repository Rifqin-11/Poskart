export const businessProfile = {
  brandName: "POSKART",
  businessName: "POSKART Indonesia",
  legalName: "POSKART Indonesia",
  description:
    "POSKART adalah SaaS dashboard dan visual builder untuk mengelola photobooth kiosk, template, QRIS transaction monitoring, device devices, pricing, media assets, organization, dan analytics.",
  email: "support@poskart.my.id",
  salesEmail: "sales@poskart.my.id",
  phone: "+62 82219262377",
  whatsapp: "+62 82219262377",
  whatsappUrl: "https://wa.me/6282219262377",
  address:
    "Perumahan Gayam Permai, Kutabanjarnegara, Banjarnegara, Jawa Tengah",
  supportHours: "Monday-Friday, 09:00-18:00 WIB",
  domain: "https://poskart.my.id",
  taxNote:
    "Harga belum termasuk pajak yang berlaku, kecuali dinyatakan lain pada invoice atau kontrak.",
  billingNote:
    "Subscription POSKART tersedia dalam pilihan 1 bulan dan 3 bulan dengan 1 device, 6 bulan dengan 3 devices, serta 1 tahun dengan 5 devices. Device tambahan ditagihkan Rp 50K per device per bulan.",
  purchaseFlow:
    "Untuk berlangganan, pelanggan dapat memilih paket, lanjut ke halaman checkout, lalu menyelesaikan pembayaran melalui Duitku Sandbox sebelum payment gateway production diaktifkan.",
};

export const reviewTestAccount = {
  email: "reviewer@poskart.my.id",
  password: "ReviewPOSKART123!",
  role: "Customer reviewer",
};

export const ADDITIONAL_DEVICE_PRICE_MONTHLY = 50000;

export const SUBSCRIPTION_INCLUDED_DEVICES = {
  monthly: 1,
  quarterly: 1,
  semiannual: 3,
  yearly: 5,
} as const;

export type PricingPlan = {
  id: string;
  name: string;
  price: string;
  amount: number;
  durationMonths: number;
  includedDevices: number;
  additionalDevicePriceMonthly: number;
  period: string;
  duration: string;
  description: string;
  cta: string;
  highlighted: boolean;
  features: string[];
  limits: string[];
};

export const pricingPlans: PricingPlan[] = [
  {
    id: "monthly",
    name: "1 Month",
    price: "Rp 50K",
    amount: 50000,
    durationMonths: 1,
    includedDevices: SUBSCRIPTION_INCLUDED_DEVICES.monthly,
    additionalDevicePriceMonthly: ADDITIONAL_DEVICE_PRICE_MONTHLY,
    period: "/month",
    duration: "1 month access",
    description: "For operators who want to start POSKART with flexible monthly billing.",
    cta: "Subscribe 1 Month",
    highlighted: false,
    features: [
      "POSKART dashboard",
      "Visual layout builder",
      "Theme and template CMS",
      "QRIS transaction monitoring",
      "1 device included",
      "Additional device Rp 50K/device/month",
    ],
    limits: ["1 month access", "1 device included", "Flexible renewal"],
  },
  {
    id: "quarterly",
    name: "3 Months",
    price: "Rp 140K",
    amount: 140000,
    durationMonths: 3,
    includedDevices: SUBSCRIPTION_INCLUDED_DEVICES.quarterly,
    additionalDevicePriceMonthly: ADDITIONAL_DEVICE_PRICE_MONTHLY,
    period: "/3 months",
    duration: "3 months access",
    description: "For teams that want a lower total price than monthly renewal.",
    cta: "Subscribe 3 Months",
    highlighted: false,
    features: [
      "POSKART dashboard",
      "Visual layout builder",
      "Theme and template CMS",
      "QRIS transaction monitoring",
      "1 device included",
      "Additional device Rp 50K/device/month",
    ],
    limits: ["3 months access", "1 device included", "Save Rp 10K versus monthly"],
  },
  {
    id: "semiannual",
    name: "6 Months",
    price: "Rp 300K",
    amount: 300000,
    durationMonths: 6,
    includedDevices: SUBSCRIPTION_INCLUDED_DEVICES.semiannual,
    additionalDevicePriceMonthly: ADDITIONAL_DEVICE_PRICE_MONTHLY,
    period: "/6 months",
    duration: "6 months access",
    description: "For operators who prefer a fixed six-month subscription cycle.",
    cta: "Subscribe 6 Months",
    highlighted: false,
    features: [
      "POSKART dashboard",
      "Visual layout builder",
      "Theme and template CMS",
      "QRIS transaction monitoring",
      "3 devices included",
      "Additional device Rp 50K/device/month",
    ],
    limits: ["6 months access", "3 devices included", "Stable mid-term billing"],
  },
  {
    id: "yearly",
    name: "1 Year",
    price: "Rp 500K",
    amount: 500000,
    durationMonths: 12,
    includedDevices: SUBSCRIPTION_INCLUDED_DEVICES.yearly,
    additionalDevicePriceMonthly: ADDITIONAL_DEVICE_PRICE_MONTHLY,
    period: "/year",
    duration: "12 months access",
    description: "Best value for long-term POSKART operations and yearly planning.",
    cta: "Subscribe Yearly",
    highlighted: true,
    features: [
      "POSKART dashboard",
      "Visual layout builder",
      "Theme and template CMS",
      "QRIS transaction monitoring",
      "5 devices included",
      "Additional device Rp 50K/device/month",
    ],
    limits: ["12 months access", "5 devices included", "Best value subscription"],
  },
];

export function calculateSubscriptionTotal(plan: PricingPlan, deviceCount: number) {
  const normalizedDeviceCount = Math.max(
    plan.includedDevices,
    Math.floor(deviceCount || plan.includedDevices),
  );
  const additionalDevices = Math.max(0, normalizedDeviceCount - plan.includedDevices);
  const additionalDeviceAmount =
    additionalDevices * plan.additionalDevicePriceMonthly * plan.durationMonths;

  return {
    deviceCount: normalizedDeviceCount,
    includedDevices: plan.includedDevices,
    additionalDevices,
    additionalDevicePriceMonthly: plan.additionalDevicePriceMonthly,
    baseAmount: plan.amount,
    additionalDeviceAmount,
    totalAmount: plan.amount + additionalDeviceAmount,
  };
}

export const legalLinks = [
  { href: "/about", label: "About" },
  { href: "/subscriptions", label: "Pricing" },
  { href: "/contact", label: "Contact" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund-policy", label: "Refund Policy" },
];
