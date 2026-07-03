import { NextResponse, type NextRequest } from "next/server";

import { isSuperAdminEmail } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

const CONFIG_ID = "default";
const GATEWAYS = ["duitku", "midtrans", "both"] as const;

type GatewayMode = (typeof GATEWAYS)[number];

export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!isSuperAdminEmail(authData.user?.email)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("app_configs")
    .select(
      "subscription_payment_gateway,gateway_fee_percentage,platform_fee_percentage,payout_adjustment_amount,minimum_payout_amount",
    )
    .eq("id", CONFIG_ID)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    gateway: normalizeGateway(data?.subscription_payment_gateway),
    gatewayFeePercentage: Number(data?.gateway_fee_percentage ?? 0),
    platformFeePercentage: Number(data?.platform_fee_percentage ?? 0),
    payoutAdjustmentAmount: Number(data?.payout_adjustment_amount ?? 0),
    minimumPayoutAmount: Number(data?.minimum_payout_amount ?? 0),
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!isSuperAdminEmail(authData.user?.email)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    gateway?: unknown;
    gatewayFeePercentage?: unknown;
    platformFeePercentage?: unknown;
    payoutAdjustmentAmount?: unknown;
    minimumPayoutAmount?: unknown;
  } | null;
  const gateway = normalizeGateway(body?.gateway);
  const gatewayFeePercentage = normalizePercentage(body?.gatewayFeePercentage);
  const platformFeePercentage = normalizePercentage(body?.platformFeePercentage);
  const payoutAdjustmentAmount = normalizeSignedMoney(body?.payoutAdjustmentAmount);
  const minimumPayoutAmount = normalizeMoney(body?.minimumPayoutAmount);

  const { error } = await supabase.from("app_configs").upsert({
    id: CONFIG_ID,
    subscription_payment_gateway: gateway,
    gateway_fee_percentage: gatewayFeePercentage,
    platform_fee_percentage: platformFeePercentage,
    payout_adjustment_amount: payoutAdjustmentAmount,
    minimum_payout_amount: minimumPayoutAmount,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    gateway,
    gatewayFeePercentage,
    platformFeePercentage,
    payoutAdjustmentAmount,
    minimumPayoutAmount,
  });
}

function normalizeGateway(value: unknown): GatewayMode {
  return typeof value === "string" && GATEWAYS.includes(value as GatewayMode)
    ? (value as GatewayMode)
    : "duitku";
}

function normalizePercentage(value: unknown) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

function normalizeMoney(value: unknown) {
  const parsed = Math.round(Number(value ?? 0));
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

function normalizeSignedMoney(value: unknown) {
  const parsed = Math.round(Number(value ?? 0));
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}
