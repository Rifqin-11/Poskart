import type { NextRequest } from "next/server";
import { completeKioskGoogleCallback } from "@/lib/kiosk/oauth";

export async function GET(request: NextRequest) {
  return completeKioskGoogleCallback(request);
}
