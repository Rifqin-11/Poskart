import { NextResponse, type NextRequest } from "next/server";

import { isSuperAdminProfile } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

const CONFIG_ID = "default";
const GATEWAYS = ["duitku", "midtrans", "both"] as const;
const FEE_TYPES = ["percentage", "fixed"] as const;

type GatewayMode = (typeof GATEWAYS)[number];
type FeeType = (typeof FEE_TYPES)[number];

export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!(await isSuperAdminProfile(supabase, authData.user?.id))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("app_configs")
    .select(
      "subscription_payment_gateway,gateway_fee_type,gateway_fee_percentage,gateway_fee_fixed_amount,platform_fee_type,platform_fee_percentage,platform_fee_fixed_amount,payout_adjustment_amount,minimum_payout_amount",
    )
    .eq("id", CONFIG_ID)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    gateway: normalizeGateway(data?.subscription_payment_gateway),
    gatewayFeeType: normalizeFeeType(data?.gateway_fee_type),
    gatewayFeePercentage: Number(data?.gateway_fee_percentage ?? 0),
    gatewayFeeFixedAmount: Number(data?.gateway_fee_fixed_amount ?? 0),
    platformFeeType: normalizeFeeType(data?.platform_fee_type),
    platformFeePercentage: Number(data?.platform_fee_percentage ?? 0),
    platformFeeFixedAmount: Number(data?.platform_fee_fixed_amount ?? 0),
    payoutAdjustmentAmount: Number(data?.payout_adjustment_amount ?? 0),
    minimumPayoutAmount: Number(data?.minimum_payout_amount ?? 0),
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!(await isSuperAdminProfile(supabase, authData.user?.id))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    gateway?: unknown;
    gatewayFeeType?: unknown;
    gatewayFeePercentage?: unknown;
    gatewayFeeFixedAmount?: unknown;
    platformFeeType?: unknown;
    platformFeePercentage?: unknown;
    platformFeeFixedAmount?: unknown;
    payoutAdjustmentAmount?: unknown;
    minimumPayoutAmount?: unknown;
  } | null;
  const gateway = normalizeGateway(body?.gateway);
  const payload: Record<string, unknown> = {
    id: CONFIG_ID,
    subscription_payment_gateway: gateway,
    updated_at: new Date().toISOString(),
  };

  if (body && "gatewayFeeType" in body) {
    payload.gateway_fee_type = normalizeFeeType(body.gatewayFeeType);
  }
  if (body && "gatewayFeePercentage" in body) {
    payload.gateway_fee_percentage = normalizePercentage(
      body.gatewayFeePercentage,
    );
  }
  if (body && "gatewayFeeFixedAmount" in body) {
    payload.gateway_fee_fixed_amount = normalizeMoney(
      body.gatewayFeeFixedAmount,
    );
  }
  if (body && "platformFeeType" in body) {
    payload.platform_fee_type = normalizeFeeType(body.platformFeeType);
  }
  if (body && "platformFeePercentage" in body) {
    payload.platform_fee_percentage = normalizePercentage(
      body.platformFeePercentage,
    );
  }
  if (body && "platformFeeFixedAmount" in body) {
    payload.platform_fee_fixed_amount = normalizeMoney(
      body.platformFeeFixedAmount,
    );
  }
  if (body && "payoutAdjustmentAmount" in body) {
    payload.payout_adjustment_amount = normalizeSignedMoney(
      body.payoutAdjustmentAmount,
    );
  }
  if (body && "minimumPayoutAmount" in body) {
    payload.minimum_payout_amount = normalizeMoney(body.minimumPayoutAmount);
  }

  const { error } = await supabase.from("app_configs").upsert(payload);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    gateway,
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

function normalizeFeeType(value: unknown): FeeType {
  return typeof value === "string" && FEE_TYPES.includes(value as FeeType)
    ? (value as FeeType)
    : "percentage";
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
