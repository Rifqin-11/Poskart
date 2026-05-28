import Link from "next/link";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";

import { PublicFooter, PublicHeader } from "@/components/layout/public-site-shell";
import { buttonVariants } from "@/components/ui/button";

export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: Promise<{
    order?: string;
    merchantOrderId?: string;
    order_id?: string;
    resultCode?: string;
    reference?: string;
    transaction_status?: string;
    status_code?: string;
  }>;
}) {
  const params = await searchParams;
  const orderId = params.order ?? params.merchantOrderId ?? params.order_id;
  const paid =
    params.resultCode === "00" ||
    params.transaction_status === "settlement" ||
    params.transaction_status === "capture" ||
    params.status_code === "200";
  const failed =
    params.resultCode === "01" ||
    params.transaction_status === "deny" ||
    params.transaction_status === "expire" ||
    params.transaction_status === "cancel" ||
    params.transaction_status === "failure";

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <PublicHeader />
      <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="mb-5 grid size-12 place-items-center rounded-lg bg-zinc-100">
            {paid ? (
              <CheckCircle2 className="size-6 text-emerald-600" />
            ) : failed ? (
              <XCircle className="size-6 text-red-600" />
            ) : (
              <Clock3 className="size-6 text-zinc-700" />
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {paid ? "Payment received" : failed ? "Payment was not completed" : "Payment is being checked"}
          </h1>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            {paid
              ? "Pembayaran subscription POSKART berhasil diterima. Sistem akan memproses aktivasi paket."
              : failed
                ? "Pembayaran dibatalkan atau gagal diproses. Anda dapat kembali ke checkout untuk mencoba metode pembayaran lain."
                : "Jika pembayaran sudah dilakukan, status order akan diperbarui setelah Payment Gateway mengirim callback pembayaran."}
          </p>
          {orderId ? (
            <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
              Order ID: <span className="font-medium text-zinc-950">{orderId}</span>
              {params.reference ? (
                <span className="mt-1 block">
                  Reference: <span className="font-medium text-zinc-950">{params.reference}</span>
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/checkout" className={buttonVariants()}>
              Back to checkout
            </Link>
            <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
              Open dashboard
            </Link>
          </div>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
