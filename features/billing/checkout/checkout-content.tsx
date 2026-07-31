"use client";

import Link from "next/link";
import Script from "next/script";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { CreditCard, Minus, Plus, ReceiptText } from "lucide-react";
import { createSubscriptionOrderAction } from "@/app/(admin)/checkout/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  businessProfile,
  calculateSubscriptionTotal,
  pricingPlans as fallbackPricingPlans,
  type PricingPlan,
} from "@/lib/constants/business";
import { formatCurrency } from "@/lib/utils";

type PaymentGateway = "duitku" | "midtrans";
type GatewayMode = PaymentGateway | "both";
type DuitkuCheckoutResult = {
  resultCode?: string;
  merchantOrderId?: string;
  reference?: string;
};

declare global {
  interface Window {
    checkout?: {
      process: (
        reference: string,
        options: {
          defaultLanguage?: "id" | "en";
          successEvent?: (result: DuitkuCheckoutResult) => void;
          pendingEvent?: (result: DuitkuCheckoutResult) => void;
          errorEvent?: (result: DuitkuCheckoutResult) => void;
          closeEvent?: (result: DuitkuCheckoutResult) => void;
        },
      ) => void;
    };
  }
}

export function CheckoutContent({
  gatewayMode = "duitku",
  plans = fallbackPricingPlans,
  duitkuPopScriptUrl = "https://app-prod.duitku.com/lib/js/duitku.js",
}: {
  gatewayMode?: GatewayMode;
  plans?: PricingPlan[];
  duitkuPopScriptUrl?: string;
}) {
  const searchParams = useSearchParams();
  const selectedPlanId = searchParams.get("plan") ?? "starter-monthly";
  const selectedDeviceCount = Number(searchParams.get("devices"));
  const successMessage = searchParams.get("success");
  const errorMessage = searchParams.get("error");
  const visiblePlans = plans.length > 0 ? plans : fallbackPricingPlans;
  // The checkout URL is the source of truth. This keeps the selected duration
  // from the pricing page intact instead of silently falling back to monthly.
  const plan =
    visiblePlans.find((item) => item.id === selectedPlanId) ??
    visiblePlans.find((item) => item.id === "starter-monthly") ??
    visiblePlans[0] ??
    fallbackPricingPlans[0];
  const [deviceCount, setDeviceCount] = useState<number>(
    Math.max(
      plan.includedDevices,
      Number.isFinite(selectedDeviceCount)
        ? selectedDeviceCount
        : plan.includedDevices,
    ),
  );
  const paymentGateway: PaymentGateway =
    gatewayMode === "midtrans" ? "midtrans" : "duitku";
  const [isPending, startTransition] = useTransition();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [duitkuScriptReady, setDuitkuScriptReady] = useState(false);
  const [duitkuScriptFailed, setDuitkuScriptFailed] = useState(false);
  const quote = calculateSubscriptionTotal(plan, deviceCount);
  const selectedGatewayLabel =
    paymentGateway === "midtrans" ? "Midtrans" : "Duitku";
  const plansInSameTier = visiblePlans
    .filter((item) =>
      plan.tierId ? item.tierId === plan.tierId : item.name === plan.name,
    )
    .sort((left, right) => left.durationMonths - right.durationMonths);
  const longerDurationOffers = plansInSameTier
    .filter((item) => item.durationMonths > plan.durationMonths)
    .slice(0, 2);
  const monthlyPlan = plansInSameTier.find((item) => item.durationMonths === 1);
  const showDuitku = gatewayMode === "duitku" || gatewayMode === "both";
  const visibleError = checkoutError ?? errorMessage;
  const waitingForDuitkuScript =
    paymentGateway === "duitku" && !duitkuScriptReady && !duitkuScriptFailed;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setCheckoutError(null);
    setCheckoutMessage(null);

    startTransition(async () => {
      const result = await createSubscriptionOrderAction(formData);

      if (!result.ok) {
        setCheckoutError(result.message);
        return;
      }

      if (result.gateway === "midtrans") {
        window.location.href = result.paymentUrl;
        return;
      }

      if (
        !duitkuScriptReady ||
        duitkuScriptFailed ||
        !window.checkout?.process
      ) {
        window.location.href = appendDuitkuLanguage(result.paymentUrl);
        return;
      }

      window.checkout.process(result.reference, {
        defaultLanguage: "id",
        successEvent: (response) => {
          window.location.href = buildDuitkuReturnUrl(
            result.returnUrl,
            response,
            "00",
          );
        },
        pendingEvent: (response) => {
          window.location.href = buildDuitkuReturnUrl(
            result.returnUrl,
            response,
            "01",
          );
        },
        errorEvent: (response) => {
          window.location.href = buildDuitkuReturnUrl(
            result.returnUrl,
            response,
            "02",
          );
        },
        closeEvent: () => {
          setCheckoutMessage(
            "Payment popup closed. Your order is still pending if no payment was completed.",
          );
        },
      });
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto grid max-w-6xl gap-5 px-3 py-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,380px)] lg:items-start lg:px-6 lg:py-7"
    >
      {showDuitku ? (
        <Script
          id="duitku-pop-script"
          src={duitkuPopScriptUrl}
          strategy="afterInteractive"
          onReady={() => {
            setDuitkuScriptReady(true);
            setDuitkuScriptFailed(false);
          }}
          onError={() => {
            setDuitkuScriptFailed(true);
          }}
        />
      ) : null}
      <input type="hidden" name="planId" value={plan.id} />
      <input type="hidden" name="paymentGateway" value={paymentGateway} />
      <div className="space-y-5">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
            <CreditCard className="size-3.5 text-red-500" />
            Checkout
          </div>
          <h1 className="max-w-2xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl md:text-4xl">
            Complete your POSKART subscription.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600">
            Choose the number of devices for this subscription.
          </p>
        </div>

        {successMessage ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            {successMessage}
          </div>
        ) : null}
        {visibleError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {visibleError}
          </div>
        ) : null}
        {checkoutMessage ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
            {checkoutMessage}
          </div>
        ) : null}

        {longerDurationOffers.length > 0 ? (
          <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Save more with longer plans
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Choose a longer access period for a better price.
                </p>
              </div>
              <span className="w-fit shrink-0 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800">
                {plan.durationMonths} months selected
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {longerDurationOffers.map((offer) => {
                const originalAmount =
                  offer.compareAtAmount ??
                  (monthlyPlan
                    ? monthlyPlan.amount * offer.durationMonths
                    : undefined);
                const savingsPercent = getSavingsPercent(
                  originalAmount,
                  offer.amount,
                );

                return (
                  <Link
                    key={offer.id}
                    href={`/checkout?plan=${offer.id}&devices=${quote.deviceCount}`}
                    className="group rounded-2xl border border-zinc-200 bg-zinc-50 p-4 transition hover:border-[#00357B]/35 hover:bg-blue-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00357B] focus-visible:ring-offset-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-zinc-950">
                        {offer.durationMonths} months
                      </span>
                      {savingsPercent > 0 ? (
                        <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                          Hemat {savingsPercent}%
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
                      <div className="min-w-0">
                        {originalAmount ? (
                          <span className="block text-xs text-zinc-400">
                            Regular price{" "}
                            <span className="line-through">
                              {formatCurrency(originalAmount)}
                            </span>
                          </span>
                        ) : null}
                        <span className="mt-1 block text-base font-semibold tracking-tight text-zinc-950 sm:text-lg">
                          {offer.price}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-[#00357B] transition group-hover:translate-x-0.5">
                        Select →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Subscription devices
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {plan.includedDevices} device
                {plan.includedDevices > 1 ? "s are" : " is"} included in this
                plan.
              </p>
            </div>
            <span className="w-fit shrink-0 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800">
              {plan.name}
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-zinc-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <p className="text-sm font-medium text-zinc-950">Total devices</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Additional devices cost{" "}
                {formatCurrency(plan.additionalDevicePriceMonthly)} per month.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 self-start rounded-xl bg-white p-1 shadow-sm ring-1 ring-zinc-200 sm:self-auto">
              <button
                type="button"
                aria-label="Decrease device count"
                className="grid size-9 place-items-center rounded-lg text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-35"
                disabled={quote.deviceCount <= plan.includedDevices}
                onClick={() =>
                  setDeviceCount((current) =>
                    Math.max(plan.includedDevices, current - 1),
                  )
                }
              >
                <Minus className="size-4" />
              </button>
              <output
                aria-live="polite"
                className="min-w-8 text-center text-base font-semibold tabular-nums text-zinc-950"
              >
                {quote.deviceCount}
              </output>
              <button
                type="button"
                aria-label="Increase device count"
                className="grid size-9 place-items-center rounded-lg text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-35"
                disabled={quote.deviceCount >= 99}
                onClick={() =>
                  setDeviceCount((current) => Math.min(99, current + 1))
                }
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
          <input name="deviceCount" type="hidden" value={quote.deviceCount} />
        </section>

        {/* <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Payment gateway</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                Choose the payment gateway for this subscription checkout.
              </p>
            </div>
            {gatewayMode === "both" ? (
              <span className="w-fit rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
                Alternative available
              </span>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 2xl:grid-cols-2">
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
                      Pembayaran langsung melalui ShopeePay QRIS pada popup
                      Duitku.
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
                      Alternative checkout through Midtrans Snap redirect.
                    </span>
                  </span>
                </div>
              </label>
            ) : null}
          </div>
        </div> */}
      </div>

      <aside className="h-fit rounded-[1.75rem] border border-zinc-200 bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <ReceiptText className="size-5 text-zinc-500" />
          <h2 className="text-lg font-semibold">Order summary</h2>
        </div>

        <div className="rounded-2xl bg-zinc-100 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{plan.name}</div>
              <div className="mt-1 text-xs text-zinc-500">
                {plan.duration} · {quote.deviceCount} device
                {quote.deviceCount > 1 ? "s" : ""}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-lg font-semibold">{plan.price}</div>
              <div className="text-xs text-zinc-500">{plan.period}</div>
            </div>
          </div>
          <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4">
            <div className="flex justify-between text-sm">
              <span>Base subscription</span>
              <span>{formatCurrency(quote.baseAmount)}</span>
            </div>
            {quote.additionalDevices > 0 ? (
              <div className="flex justify-between text-sm">
                <span>
                  Additional devices
                  <span className="ml-1 text-xs text-zinc-500">
                    × {quote.additionalDevices}
                  </span>
                </span>
                <span>{formatCurrency(quote.additionalDeviceAmount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-zinc-200 pt-4 text-base font-semibold text-zinc-950">
              <span>Total due</span>
              <span>{formatCurrency(quote.totalAmount)}</span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-zinc-500">
          Secure payment via {selectedGatewayLabel}
        </p>

        <Button
          type="submit"
          className="mt-4 w-full bg-[#00357B] hover:bg-[#002a63]"
          size="lg"
          disabled={isPending || waitingForDuitkuScript}
        >
          {isPending
            ? "Preparing secure payment..."
            : waitingForDuitkuScript
              ? "Loading secure payment..."
              : `Continue to ${paymentGateway === "midtrans" ? "Midtrans" : "Duitku"}`}
          <CreditCard className="size-4" />
        </Button>
        <Link
          href="/#pricing"
          className={buttonVariants({
            variant: "outline",
            className: "mt-2 w-full",
          })}
        >
          Change plan
        </Link>

        <p className="mt-4 text-xs leading-5 text-zinc-500">
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

function appendDuitkuLanguage(paymentUrl: string) {
  const url = new URL(paymentUrl, window.location.origin);
  if (!url.searchParams.has("lang")) {
    url.searchParams.set("lang", "id");
  }
  return url.toString();
}

function getSavingsPercent(originalAmount: number | undefined, amount: number) {
  if (!originalAmount || originalAmount <= amount) return 0;

  return Math.round(((originalAmount - amount) / originalAmount) * 100);
}

function buildDuitkuReturnUrl(
  returnUrl: string,
  response: DuitkuCheckoutResult,
  fallbackResultCode: string,
) {
  const url = new URL(returnUrl, window.location.origin);
  url.searchParams.set("resultCode", response.resultCode ?? fallbackResultCode);
  if (response.merchantOrderId) {
    url.searchParams.set("merchantOrderId", response.merchantOrderId);
  }
  if (response.reference) {
    url.searchParams.set("reference", response.reference);
  }
  return url.toString();
}
