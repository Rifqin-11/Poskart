import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSuperAdminEmail } from "@/lib/auth/admin";
import { normalizeOrganizationFeatures } from "@/lib/organization-features";

export async function updateSession(request: NextRequest) {
  if (request.nextUrl.pathname === "/" && request.nextUrl.searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const protectedRoutes = [
    "/dashboard",
    "/organization",
    "/pricing",
    "/onboarding",
    "/pos",
    "/money",
    "/builder",
    "/themes",
    "/templates",
    "/admin",
    "/superadmin",
    "/transactions",
    "/devices",
    "/analytics",
    "/settings",
  ];
  const authRoutes = ["/login", "/register"];
  const subscriptionRoutes = [
    "/builder",
    "/pos",
    "/money",
    "/themes",
    "/templates",
    "/transactions",
    "/devices",
    "/pricing",
    "/analytics",
    "/settings",
  ];
  const pathname = request.nextUrl.pathname;

  const isProtectedCheckoutRoute = pathname === "/checkout";
  const isProtectedRoute =
    isProtectedCheckoutRoute ||
    protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const isAuthRoute = authRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const isSubscriptionRoute = subscriptionRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const featureRoute =
    pathname === "/pos" || pathname.startsWith("/pos/")
      ? "posKasir"
      : pathname === "/money" || pathname.startsWith("/money/")
        ? "money"
        : null;
  const isOrganizationSettingsRoute =
    pathname === "/settings" && request.nextUrl.searchParams.get("tab") === "organization";

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && isProtectedRoute) {
    const { data: member } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("profile_id", user.sub)
      .limit(1)
      .maybeSingle();
    const hasOrganization = Boolean(member?.organization_id);

    if (!hasOrganization && pathname !== "/onboarding") {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (hasOrganization && pathname === "/onboarding") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (user && isSubscriptionRoute && !isOrganizationSettingsRoute) {
    const email = typeof user.email === "string" ? user.email.toLowerCase() : "";
    const isSuperAdmin = isSuperAdminEmail(email);

    if (!isSuperAdmin) {
      const { data: member } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("profile_id", user.sub)
        .limit(1)
        .maybeSingle();

      const { data: subscription } = member?.organization_id
        ? await supabase
            .from("subscriptions")
            .select("plan_id,status,current_period_end")
            .eq("organization_id", member.organization_id)
            .maybeSingle()
        : { data: null };

      const expiryTime = subscription?.current_period_end
        ? new Date(subscription.current_period_end).getTime()
        : 0;
      const hasActiveSubscription =
        ["active", "trialing"].includes(subscription?.status ?? "") &&
        expiryTime > Date.now();

      if (!hasActiveSubscription) {
        const url = request.nextUrl.clone();
        url.pathname = "/settings";
        url.search = "";
        url.searchParams.set("tab", "organization");
        url.searchParams.set("subscription", "required");
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
    }
  }

  if (user && featureRoute) {
    const email = typeof user.email === "string" ? user.email.toLowerCase() : "";
    const isSuperAdmin = isSuperAdminEmail(email);

    if (!isSuperAdmin) {
      const { data: member } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("profile_id", user.sub)
        .limit(1)
        .maybeSingle();

      const { data: organization } = member?.organization_id
        ? await supabase
            .from("organizations")
            .select("features")
            .eq("id", member.organization_id)
            .maybeSingle()
        : { data: null };

      if (!normalizeOrganizationFeatures(organization?.features)[featureRoute]) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
