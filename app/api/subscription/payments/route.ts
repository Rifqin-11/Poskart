import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { refreshSubscriptionPayment, subscriptionPaymentColumns } from "@/server/subscription/payment-reconciliation";
import type { SubscriptionPayment } from "@/features/billing/subscription/payment-types";

const privateHeaders = { "Cache-Control": "private, no-store" };

async function getPaymentScope() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle();
  if (membershipError) throw new Error(membershipError.message);
  return { organizationId: membership?.organization_id as string | undefined };
}

export async function GET(request: NextRequest) {
  try {
    const scope = await getPaymentScope();
    if (!scope) return NextResponse.json({ message: "Masuk untuk melihat pembayaran Anda." }, { status: 401, headers: privateHeaders });
    if (!scope.organizationId) return NextResponse.json({ orders: [] }, { headers: privateHeaders });
    const orderId = request.nextUrl.searchParams.get("order");
    const supabase = createSupabaseAdminClient();
    let query = supabase.from("subscription_orders")
      .select(subscriptionPaymentColumns)
      .eq("organization_id", scope.organizationId)
      .not("merchant_order_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(30);
    if (orderId) query = query.eq("merchant_order_id", orderId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ orders: data ?? [] }, { headers: privateHeaders });
  } catch (error) {
    console.error("Unable to load subscription payments", error);
    return NextResponse.json({ message: "Riwayat pembayaran belum dapat dimuat. Silakan coba lagi." }, { status: 500, headers: privateHeaders });
  }
}

export async function POST(request: NextRequest) {
  // Checking gateway state can activate a subscription: allow same-origin only.
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json({ message: "Permintaan tidak diizinkan." }, { status: 403, headers: privateHeaders });
  }
  try {
    const scope = await getPaymentScope();
    if (!scope) return NextResponse.json({ message: "Masuk untuk mengecek pembayaran Anda." }, { status: 401, headers: privateHeaders });
    if (!scope.organizationId) return NextResponse.json({ message: "Organization tidak ditemukan." }, { status: 403, headers: privateHeaders });
    const body = await request.json().catch(() => null);
    const orderId = typeof body?.order === "string" ? body.order.trim() : "";
    if (!orderId || orderId.length > 200) return NextResponse.json({ message: "Order tidak valid." }, { status: 400, headers: privateHeaders });
    const supabase = createSupabaseAdminClient();
    const { data: order, error } = await supabase.from("subscription_orders")
      .select(subscriptionPaymentColumns)
      .eq("merchant_order_id", orderId)
      .eq("organization_id", scope.organizationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) return NextResponse.json({ message: "Pembayaran tidak ditemukan." }, { status: 404, headers: privateHeaders });
    const updatedOrder = await refreshSubscriptionPayment(supabase, order as SubscriptionPayment, scope.organizationId);
    return NextResponse.json({ order: updatedOrder }, { headers: privateHeaders });
  } catch (error) {
    console.error("Unable to verify subscription payment", error);
    return NextResponse.json({ message: "Status belum dapat dikonfirmasi. Jika sudah membayar, jangan bayar ulang. Coba cek lagi nanti." }, { status: 502, headers: privateHeaders });
  }
}
