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
    .select("subscription_payment_gateway")
    .eq("id", CONFIG_ID)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    gateway: normalizeGateway(data?.subscription_payment_gateway),
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!isSuperAdminEmail(authData.user?.email)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { gateway?: unknown } | null;
  const gateway = normalizeGateway(body?.gateway);

  const { error } = await supabase.from("app_configs").upsert({
    id: CONFIG_ID,
    subscription_payment_gateway: gateway,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ gateway });
}

function normalizeGateway(value: unknown): GatewayMode {
  return typeof value === "string" && GATEWAYS.includes(value as GatewayMode)
    ? (value as GatewayMode)
    : "duitku";
}
