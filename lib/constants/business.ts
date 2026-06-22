export const businessProfile = {
  brandName: "POSKART",
  businessName: "POSKART Indonesia",
  legalName: "POSKART Indonesia",
  description:
    "POSKART adalah SaaS dashboard dan visual builder untuk mengelola photobooth kiosk, template, QRIS transaction monitoring, device devices, pricing, organization, dan analytics.",
  email: "support@poskart.my.id",
  salesEmail: "sales@poskart.my.id",
  phone: "+62 85846626622",
  whatsapp: "+62 85846626622",
  whatsappUrl: "https://wa.me/6285846626622",
  address: "Banjarnegara, Jawa Tengah",
  businessType: "Usaha Perorangan",
  businessOwner: "Rifqi Naufal",
  supportHours: "Monday-Friday, 09:00-18:00 WIB",
  domain: "https://poskart.my.id",
  taxNote:
    "Harga belum termasuk pajak yang berlaku, kecuali dinyatakan lain pada invoice atau kontrak.",
  billingNote:
    "Subscription POSKART tersedia dalam paket Starter, Growth, dan Business dengan pilihan 1 bulan, 3 bulan, 6 bulan, dan 12 bulan. Device tambahan ditagihkan Rp 50K per device per bulan.",
  purchaseFlow:
    "Untuk berlangganan, pelanggan dapat memilih paket, lanjut ke halaman checkout, lalu menyelesaikan pembayaran melalui payment gateway yang tersedia.",
};

export const ADDITIONAL_DEVICE_PRICE_MONTHLY = 50000;

export const SUBSCRIPTION_INCLUDED_DEVICES = {
  starter: 1,
  growth: 3,
  business: 5,
  monthly: 1,
  quarterly: 1,
  semiannual: 3,
  yearly: 5,
} as const;

export type PricingTierId = "starter" | "growth" | "business";

export const PRICING_TIERS: Array<{
  id: PricingTierId;
  name: string;
  includedDevices: number;
  audience: string;
  description: string;
}> = [
  {
    id: "starter",
    name: "Starter",
    includedDevices: 1,
    audience: "Operator baru / coba-coba",
    description:
      "Untuk operator yang baru mulai menggunakan POSKART dengan satu booth utama.",
  },
  {
    id: "growth",
    name: "Growth",
    includedDevices: 3,
    audience: "Operator kecil-menengah",
    description:
      "Untuk tim photobooth kecil-menengah yang mulai mengelola beberapa device.",
  },
  {
    id: "business",
    name: "Business",
    includedDevices: 5,
    audience: "Operator aktif / banyak event",
    description:
      "Untuk operator aktif dengan beberapa booth dan kebutuhan event yang lebih padat.",
  },
];

export const PRICING_DURATION_OPTIONS = [
  { id: "monthly", months: 1, label: "Bulanan", period: "/bulan", duration: "1 month access" },
  { id: "quarterly", months: 3, label: "3 Bulan", period: "/3 bulan", duration: "3 months access" },
  { id: "semiannual", months: 6, label: "6 Bulan", period: "/6 bulan", duration: "6 months access" },
  { id: "yearly", months: 12, label: "Tahunan", period: "/tahun", duration: "12 months access" },
] as const;

const PRICING_MATRIX: Record<PricingTierId, Record<number, number>> = {
  starter: {
    1: 50000,
    3: 140000,
    6: 270000,
    12: 480000,
  },
  growth: {
    1: 140000,
    3: 390000,
    6: 740000,
    12: 1350000,
  },
  business: {
    1: 225000,
    3: 625000,
    6: 1190000,
    12: 2160000,
  },
};

const MONTHLY_COMPARE_AT_MATRIX: Partial<Record<PricingTierId, number>> = {
  growth: 150000,
  business: 250000,
};

export const PRICING_PLAN_ORDER = PRICING_TIERS.flatMap((tier) =>
  PRICING_DURATION_OPTIONS.map((duration) => `${tier.id}-${duration.id}`),
);

export type PricingPlan = {
  id: string;
  name: string;
  tierId?: PricingTierId;
  audience?: string;
  price: string;
  amount: number;
  compareAtAmount?: number;
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

export const pricingPlans: PricingPlan[] = PRICING_TIERS.flatMap((tier) =>
  PRICING_DURATION_OPTIONS.map((duration) => {
    const amount = PRICING_MATRIX[tier.id][duration.months];
    const compareAtAmount = getCompareAtAmount(tier.id, duration.months);
    const deviceLabel = `${tier.includedDevices} device${tier.includedDevices > 1 ? "s" : ""}`;

    return {
      id: `${tier.id}-${duration.id}`,
      name: tier.name,
      tierId: tier.id,
      audience: tier.audience,
      price: formatRupiah(amount),
      amount,
      compareAtAmount,
      durationMonths: duration.months,
      includedDevices: tier.includedDevices,
      additionalDevicePriceMonthly: ADDITIONAL_DEVICE_PRICE_MONTHLY,
      period: duration.period,
      duration: duration.duration,
      description: tier.description,
      cta: `Pilih ${tier.name}`,
      highlighted: tier.id === "growth",
      features: [
        "POSKART dashboard",
        "Visual layout builder",
        "Theme and template CMS",
        "QRIS transaction monitoring",
        `${deviceLabel} included`,
        "Additional device Rp 50K/device/month",
      ],
      limits: [duration.duration, `${deviceLabel} included`, tier.audience],
    } satisfies PricingPlan;
  }),
);

function getCompareAtAmount(tierId: PricingTierId, durationMonths: number) {
  const monthlyCompareAt =
    MONTHLY_COMPARE_AT_MATRIX[tierId] ?? PRICING_MATRIX[tierId][1];
  const compareAtAmount = monthlyCompareAt * durationMonths;
  const amount = PRICING_MATRIX[tierId][durationMonths];

  return compareAtAmount > amount ? compareAtAmount : undefined;
}

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/\s/g, " ");
}

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
