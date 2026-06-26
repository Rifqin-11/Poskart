import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimization)
     * - favicon.ico, image files
     * - /api/kiosk/*  (Flutter kiosk API — uses Bearer token auth, not cookies.
     *                  Middleware's getClaims() call on these routes can cause
     *                  unexpected 307 redirects when Dio receives them.)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$|api/kiosk(?:/.*)?$).*)",
  ],
};
