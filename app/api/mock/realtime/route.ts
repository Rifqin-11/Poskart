import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("id,booth,location,customer,package_name,amount,status,provider,created_at_label")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const transactions = (data ?? []).map((transaction) => ({
    id: transaction.id,
    booth: transaction.booth,
    location: transaction.location,
    customer: transaction.customer,
    packageName: transaction.package_name,
    amount: transaction.amount,
    status: transaction.status,
    provider: transaction.provider,
    createdAt: transaction.created_at_label,
  }));

  return NextResponse.json({
    event: "transaction.created",
    payload: transactions[Math.floor(Math.random() * transactions.length)] ?? null,
    emittedAt: new Date().toISOString(),
  });
}
