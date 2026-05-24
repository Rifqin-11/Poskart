"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, CreditCard, LockKeyhole, ReceiptText } from "lucide-react";
import { createSubscriptionOrderAction } from "@/app/checkout/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { businessProfile, pricingPlans } from "@/lib/constants/business";
import { formatCurrency } from "@/lib/utils";

export function CheckoutContent() {
  const searchParams = useSearchParams();
  const selectedPlanId = searchParams.get("plan") ?? "yearly";
  const successMessage = searchParams.get("success");
  const errorMessage = searchParams.get("error");
  const plan = pricingPlans.find((item) => item.id === selectedPlanId) ?? pricingPlans[2];

  return (
    <form
      action={createSubscriptionOrderAction}
      className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8"
    >
      <input type="hidden" name="planId" value={plan.id} />
      <div className="space-y-6">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
            <CreditCard className="size-3.5 text-red-500" />
            Checkout
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">Complete your POSKART subscription.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600">
            Review your selected subscription, enter customer details, then continue to the official payment flow.
          </p>
        </div>

        {successMessage ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            {successMessage}
          </div>
        ) : null}
        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Customer information</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-xs font-medium text-zinc-500">
              Business or customer name
              <Input className="mt-1" name="customerName" placeholder="Nama bisnis / pelanggan" required />
            </label>
            <label className="text-xs font-medium text-zinc-500">
              Email
              <Input className="mt-1" name="email" type="email" placeholder="billing@example.com" required />
            </label>
            <label className="text-xs font-medium text-zinc-500">
              WhatsApp number
              <Input className="mt-1" name="whatsapp" placeholder="+62..." required />
            </label>
            <label className="text-xs font-medium text-zinc-500">
              Booth or company name
              <Input className="mt-1" name="companyName" placeholder="Nama booth / perusahaan" />
            </label>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 text-sm leading-7 text-zinc-600">
          <div className="mb-2 flex items-center gap-2 font-medium text-zinc-950">
            <LockKeyhole className="size-4" />
            Payment gateway note
          </div>
          Halaman ini disiapkan sebagai checkout publik untuk review payment gateway. Setelah payment gateway production aktif,
          tombol pembayaran dapat dihubungkan ke payment link resmi atau API payment gateway.
        </div>
      </div>

      <aside className="h-fit rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <ReceiptText className="size-5 text-zinc-500" />
          <h2 className="text-lg font-semibold">Order summary</h2>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">{plan.name}</div>
              <div className="mt-1 text-xs text-zinc-500">{plan.duration}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">{plan.price}</div>
              <div className="text-xs text-zinc-500">{plan.period}</div>
            </div>
          </div>
          <div className="mt-4 border-t border-zinc-200 pt-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(plan.amount)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm text-zinc-500">
              <span>Tax</span>
              <span>Calculated on invoice</span>
            </div>
            <div className="mt-4 flex justify-between border-t border-zinc-200 pt-4 text-base font-semibold">
              <span>Total due</span>
              <span>{formatCurrency(plan.amount)}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {plan.features.map((feature) => (
            <div key={feature} className="flex items-start gap-2 text-sm text-zinc-600">
              <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <Button
          type="submit"
          className="mt-6 w-full"
          size="lg"
        >
          Continue to Payment
          <CreditCard className="size-4" />
        </Button>
        <Link href="/pricing" className={buttonVariants({ variant: "outline", size: "lg", className: "mt-3 w-full" })}>
          Change plan
        </Link>

        <p className="mt-5 text-xs leading-5 text-zinc-500">
          By continuing, customer agrees to POSKART{" "}
          <Link href="/terms" className="font-medium text-zinc-950 underline">
            Terms
          </Link>
          ,{" "}
          <Link href="/privacy" className="font-medium text-zinc-950 underline">
            Privacy Policy
          </Link>
          , and{" "}
          <Link href="/refund-policy" className="font-medium text-zinc-950 underline">
            Refund Policy
          </Link>
          . For help, contact {businessProfile.email}.
        </p>
      </aside>
    </form>
  );
}
