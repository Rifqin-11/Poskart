import { NextResponse } from "next/server";
import { transactions } from "@/lib/mock-data/admin-data";

export function GET() {
  return NextResponse.json({
    event: "transaction.created",
    payload: transactions[Math.floor(Math.random() * transactions.length)],
    emittedAt: new Date().toISOString(),
  });
}
