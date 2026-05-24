export const businessProfile = {
  brandName: "POSKART",
  businessName: "POSKART Indonesia",
  legalName: "POSKART Indonesia",
  description:
    "POSKART adalah SaaS dashboard dan visual builder untuk mengelola photobooth kiosk, template, QRIS transaction monitoring, booth devices, pricing, media assets, tenant, dan analytics.",
  email: "rifqinaufal9009@gmail.com",
  salesEmail: "rifqinaufal9009@gmail.com",
  phone: "+62 82219262377",
  whatsapp: "+62 82219262377",
  whatsappUrl: "https://wa.me/6282219262377",
  address: "Banjarnegara, Jawa Tengah, Indonesia",
  supportHours: "Monday-Friday, 09:00-18:00 WIB",
  domain: "https://poskart.my.id",
  taxNote:
    "Harga belum termasuk pajak yang berlaku, kecuali dinyatakan lain pada invoice atau kontrak.",
  billingNote:
    "Subscription POSKART tersedia dalam pilihan 1 bulan, 3 bulan, dan 1 tahun. Paket 1 bulan ditagihkan Rp 50K, paket 3 bulan Rp 140K, dan paket 1 tahun Rp 500K.",
  purchaseFlow:
    "Untuk berlangganan, pelanggan dapat memilih paket, lanjut ke halaman checkout, lalu menyelesaikan pembayaran melalui payment link resmi setelah payment gateway production aktif.",
};

export const pricingPlans = [
  {
    id: "monthly",
    name: "Monthly",
    price: "Rp 50K",
    amount: 50000,
    period: "/month",
    duration: "1 month access",
    description: "For operators who want to start POSKART with flexible monthly billing.",
    cta: "Subscribe Monthly",
    highlighted: false,
    features: [
      "POSKART admin dashboard",
      "Visual layout builder",
      "Theme and template CMS",
      "QRIS transaction monitoring",
      "Booth and media management",
    ],
    limits: ["1 month access", "Monthly renewal", "Suitable for trial operations"],
  },
  {
    id: "quarterly",
    name: "3 Months",
    price: "Rp 140K",
    amount: 140000,
    period: "/3 months",
    duration: "3 months access",
    description: "For teams that want a lower total price than monthly renewal.",
    cta: "Subscribe 3 Months",
    highlighted: false,
    features: [
      "POSKART admin dashboard",
      "Visual layout builder",
      "Theme and template CMS",
      "QRIS transaction monitoring",
      "Booth and media management",
    ],
    limits: ["3 months access", "Save Rp 10K versus monthly", "Recommended for active operations"],
  },
  {
    id: "yearly",
    name: "1 Year",
    price: "Rp 500K",
    amount: 500000,
    period: "/year",
    duration: "12 months access",
    description: "Best value for long-term POSKART operations and yearly planning.",
    cta: "Subscribe Yearly",
    highlighted: true,
    features: [
      "POSKART admin dashboard",
      "Visual layout builder",
      "Theme and template CMS",
      "QRIS transaction monitoring",
      "Booth and media management",
    ],
    limits: ["12 months access", "Save Rp 100K versus monthly", "Best value subscription"],
  },
];

export const legalLinks = [
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund-policy", label: "Refund Policy" },
];
