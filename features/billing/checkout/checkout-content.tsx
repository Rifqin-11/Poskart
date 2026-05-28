"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, CreditCard, LockKeyhole, ReceiptText, ShieldCheck, WalletCards } from "lucide-react";
import { createSubscriptionOrderAction } from "@/app/(admin)/checkout/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  businessProfile,
  calculateSubscriptionTotal,
  pricingPlans as fallbackPricingPlans,
  type PricingPlan,
} from "@/lib/constants/business";
import { formatCurrency } from "@/lib/utils";

type PaymentGateway = "duitku" | "midtrans";
type GatewayMode = PaymentGateway | "both";

export function CheckoutContent({
  gatewayMode = "duitku",
  plans = fallbackPricingPlans,
}: {
  gatewayMode?: GatewayMode;
  plans?: PricingPlan[];
}) {
  const searchParams = useSearchParams();
  const selectedPlanId = searchParams.get("plan") ?? "yearly";
  const successMessage = searchParams.get("success");
  const errorMessage = searchParams.get("error");
  const visiblePlans = plans.length > 0 ? plans : fallbackPricingPlans;
  const plan =
    visiblePlans.find((item) => item.id === selectedPlanId) ??
    visiblePlans.find((item) => item.id === "yearly") ??
    visiblePlans[0] ??
    fallbackPricingPlans[3];
  const [deviceCount, setDeviceCount] = useState<number>(plan.includedDevices);
  const [paymentGateway, setPaymentGateway] = useState<PaymentGateway>(
    gatewayMode === "midtrans" ? "midtrans" : "duitku",
  );
  const quote = calculateSubscriptionTotal(plan, deviceCount);
  const selectedGatewayLabel = paymentGateway === "midtrans" ? "Midtrans Sandbox" : "Duitku Sandbox";
  const showDuitku = gatewayMode === "duitku" || gatewayMode === "both";
  const showMidtrans = gatewayMode === "midtrans" || gatewayMode === "both";

  return (
    <form
      action={createSubscriptionOrderAction}
      className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8"
    >
      <input type="hidden" name="planId" value={plan.id} />
      <input type="hidden" name="paymentGateway" value={paymentGateway} />
      <div className="space-y-6">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
            <CreditCard className="size-3.5 text-red-500" />
            Checkout
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">
            Complete your POSKART subscription.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600">
            Review your selected subscription, set the device quantity, then
            continue to the official payment flow.
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
          <h2 className="text-lg font-semibold">Subscription devices</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            This plan includes {plan.includedDevices} device
            {plan.includedDevices > 1 ? "s" : ""}. Additional devices are
            charged Rp 50K per device per month.
          </p>
          <label className="mt-5 block max-w-xs text-xs font-medium text-zinc-500">
            Total devices
            <Input
              className="mt-1"
              name="deviceCount"
              type="number"
              min={plan.includedDevices}
              max={99}
              value={quote.deviceCount}
              onChange={(event) =>
                setDeviceCount(
                  Math.max(
                    plan.includedDevices,
                    Number(event.target.value) || plan.includedDevices,
                  ),
                )
              }
              required
            />
          </label>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Payment gateway</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                Choose the sandbox gateway for this subscription checkout.
              </p>
            </div>
            {gatewayMode === "both" ? (
              <span className="w-fit rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
                Alternative available
              </span>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {showDuitku ? (
              <label
                className={[
                  "relative cursor-pointer rounded-lg border p-4 transition",
                  paymentGateway === "duitku"
                    ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
                    : "border-zinc-200 bg-zinc-50 text-zinc-950 hover:border-zinc-300",
                ].join(" ")}
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="paymentGatewayChoice"
                  checked={paymentGateway === "duitku"}
                  onChange={() => setPaymentGateway("duitku")}
                />
                <div className="flex items-start gap-3">
                  <span
                    className={[
                      "grid size-10 shrink-0 place-items-center rounded-md border",
                      paymentGateway === "duitku"
                        ? "border-white/20 bg-white/10"
                        : "border-zinc-200 bg-white",
                    ].join(" ")}
                  >
                    <CreditCard className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      Duitku
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          paymentGateway === "duitku"
                            ? "bg-emerald-400/15 text-emerald-200"
                            : "bg-emerald-50 text-emerald-700",
                        ].join(" ")}
                      >
                        Active
                      </span>
                    </span>
                    <span
                      className={[
                        "mt-1 block text-xs leading-5",
                        paymentGateway === "duitku" ? "text-zinc-300" : "text-zinc-500",
                      ].join(" ")}
                    >
                      Sandbox checkout with Duitku payment page and callback.
                    </span>
                  </span>
                </div>
              </label>
            ) : null}

            {showMidtrans ? (
              <label
                className={[
                  "relative cursor-pointer rounded-lg border p-4 transition",
                  paymentGateway === "midtrans"
                    ? "border-blue-600 bg-blue-50 text-zinc-950 shadow-sm"
                    : "border-zinc-200 bg-zinc-50 text-zinc-950 hover:border-zinc-300",
                ].join(" ")}
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="paymentGatewayChoice"
                  checked={paymentGateway === "midtrans"}
                  onChange={() => setPaymentGateway("midtrans")}
                />
                <div className="flex items-start gap-3">
                  <span
                    className={[
                      "grid size-10 shrink-0 place-items-center rounded-md border",
                      paymentGateway === "midtrans"
                        ? "border-blue-200 bg-white text-blue-700"
                        : "border-zinc-200 bg-white text-zinc-700",
                    ].join(" ")}
                  >
                    <WalletCards className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      Midtrans
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                        Active
                      </span>
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-zinc-500">
                      Alternative sandbox checkout with Midtrans Snap redirect.
                    </span>
                  </span>
                </div>
              </label>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 text-sm leading-7 text-zinc-600">
          <div className="mb-2 flex items-center gap-2 font-medium text-zinc-950">
            <LockKeyhole className="size-4" />
            Payment Gateway
          </div>
          Checkout ini membuat order subscription POSKART dan mengarahkan
          pelanggan ke halaman pembayaran Sandbox. Gateway pembayaran aktif
          dikendalikan dari Super Admin.
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
              <div className="mt-1 text-xs text-zinc-500">
                {plan.duration} · {quote.deviceCount} device
                {quote.deviceCount > 1 ? "s" : ""}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">{plan.price}</div>
              <div className="text-xs text-zinc-500">{plan.period}</div>
            </div>
          </div>
          <div className="mt-4 border-t border-zinc-200 pt-4">
            <div className="flex justify-between text-sm">
              <span>
                Base subscription
                <span className="block text-xs text-zinc-500">
                  Includes {quote.includedDevices} device
                  {quote.includedDevices > 1 ? "s" : ""}
                </span>
              </span>
              <span>{formatCurrency(quote.baseAmount)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span>
                Additional devices
                <span className="block text-xs text-zinc-500">
                  {quote.additionalDevices} x{" "}
                  {formatCurrency(quote.additionalDevicePriceMonthly)} x{" "}
                  {plan.durationMonths} month
                  {plan.durationMonths > 1 ? "s" : ""}
                </span>
              </span>
              <span>{formatCurrency(quote.additionalDeviceAmount)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm text-zinc-500">
              <span>Tax</span>
              <span>Calculated on invoice</span>
            </div>
            <div className="mt-4 flex justify-between border-t border-zinc-200 pt-4 text-base font-semibold">
              <span>Total due</span>
              <span>{formatCurrency(quote.totalAmount)}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
            Payment gateway:{" "}
            <span className="font-medium text-zinc-950">{selectedGatewayLabel}</span>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <span>
              {paymentGateway === "duitku"
                ? "Payments are processed through the configured Duitku Sandbox flow."
                : "Payments are processed through Midtrans Snap Sandbox and updated via notification webhook."}
            </span>
          </div>
          {plan.features.map((feature) => (
            <div
              key={feature}
              className="flex items-start gap-2 text-sm text-zinc-600"
            >
              <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <Button type="submit" className="mt-6 w-full" size="lg">
          Continue to {paymentGateway === "midtrans" ? "Midtrans" : "Duitku"}
          <CreditCard className="size-4" />
        </Button>
        <Link
          href="/organization?subscription=required"
          className={buttonVariants({
            variant: "outline",
            size: "lg",
            className: "mt-3 w-full",
          })}
        >
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
          <Link
            href="/refund-policy"
            className="font-medium text-zinc-950 underline"
          >
            Refund Policy
          </Link>
          . For help, contact {businessProfile.email}.
        </p>
      </aside>
    </form>
  );
}
