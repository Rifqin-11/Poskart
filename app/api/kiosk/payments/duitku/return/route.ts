import { NextResponse, type NextRequest } from "next/server";

export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  return NextResponse.json({
    message: "Duitku kiosk payment return received.",
    merchantOrderId: searchParams.get("merchantOrderId"),
    reference: searchParams.get("reference"),
    resultCode: searchParams.get("resultCode"),
  });
}
