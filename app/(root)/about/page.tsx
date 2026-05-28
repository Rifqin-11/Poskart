import { Building2, Camera, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/features/root/shell/public-site-shell";
import { businessProfile } from "@/lib/constants/business";

const points = [
  {
    title: "SaaS photobooth operating system",
    description: "POSKART membantu operator mengelola booth, transaksi QRIS, template, pricing, dan media asset dari satu dashboard.",
    icon: MonitorSmartphone,
  },
  {
    title: "Visual builder for kiosk screens",
    description: "Admin dapat membuat layout landing, camera, preview, dan thanks page dengan schema layout yang siap dipublish.",
    icon: Camera,
  },
  {
    title: "Business-ready workflow",
    description: "Platform disiapkan untuk multi-tenant, role admin/staff, billing SaaS, dan integrasi payment gateway Indonesia.",
    icon: ShieldCheck,
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <PublicHeader />
      <section className="border-b border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
            <Building2 className="size-3.5 text-red-500" />
            About POSKART
          </div>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
            POSKART builds software for receipt-style photobooth operators.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-600">
            {businessProfile.description}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {points.map((point) => {
            const Icon = point.icon;
            return (
              <div key={point.title} className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-5 grid size-10 place-items-center rounded-md bg-zinc-100">
                  <Icon className="size-5 text-zinc-700" />
                </div>
                <h2 className="text-sm font-semibold">{point.title}</h2>
                <p className="mt-3 text-sm leading-7 text-zinc-600">{point.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="text-lg font-semibold">Business information</h2>
          <div className="mt-4 grid gap-4 text-sm text-zinc-600 md:grid-cols-2">
            <p><span className="font-medium text-zinc-950">Brand:</span> {businessProfile.brandName}</p>
            <p><span className="font-medium text-zinc-950">Legal name:</span> {businessProfile.legalName}</p>
            <p><span className="font-medium text-zinc-950">Email:</span> {businessProfile.email}</p>
            <p><span className="font-medium text-zinc-950">Phone:</span> {businessProfile.phone}</p>
            <p className="md:col-span-2"><span className="font-medium text-zinc-950">Address:</span> {businessProfile.address}</p>
          </div>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
