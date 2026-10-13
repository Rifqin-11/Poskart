import type { Metadata } from "next";
import Link from "next/link";
import { PublicFooter, PublicHeaderWithSession } from "@/features/root/shell/public-site-shell";
import { CheckoutPaymentStatus } from "@/features/billing/checkout/checkout-payment-status";

export const metadata: Metadata = {
  title: "Status Pembayaran | POSKART",
  robots: { index: false, follow: false },
};

export default async function CheckoutReturnPage({ searchParams }: {
  searchParams: Promise<{ order?: string; merchantOrderId?: string; order_id?: string }>;
}) {
  const params = await searchParams;
  const orderId = params.order ?? params.merchantOrderId ?? params.order_id;
  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <PublicHeaderWithSession variant="default" />
      <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
        {orderId ? <CheckoutPaymentStatus orderId={orderId} /> : (
          <div className="rounded-lg border border-zinc-200 p-8">
            <h1 className="text-2xl font-semibold">Pilih pembayaran yang ingin dicek</h1>
            <p className="mt-3 text-sm text-zinc-600">Buka riwayat pembayaran di Settings → Langganan untuk melihat status order Anda.</p>
            <Link href="/settings?tab=billing" className="mt-5 inline-block text-sm font-medium underline">Lihat pembayaran</Link>
          </div>
        )}
      </section>
      <PublicFooter />
    </main>
  );
}
