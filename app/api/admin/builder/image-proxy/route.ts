import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function requireOrganization() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  const { data: membership, error } = await supabase
    .from("organization_members")
    .select("organization_id,role")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error || !membership?.organization_id) {
    return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }

  return { organizationId: String(membership.organization_id) };
}

function parseAllowedBuilderImageUrl(rawUrl: string, organizationId: string) {
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (!publicBaseUrl) return null;

  let sourceUrl: URL;
  let baseUrl: URL;
  try {
    sourceUrl = new URL(rawUrl);
    baseUrl = new URL(publicBaseUrl);
  } catch {
    return null;
  }

  if (sourceUrl.origin !== baseUrl.origin) return null;

  const key = decodeURIComponent(sourceUrl.pathname).replace(/^\/+/, "");
  const allowedPrefix = `organizations/${organizationId}/builder/images/`;
  if (!key.startsWith(allowedPrefix)) return null;

  return sourceUrl.toString();
}

export async function GET(request: NextRequest) {
  const context = await requireOrganization();
  if ("error" in context) return context.error;

  const rawUrl = request.nextUrl.searchParams.get("url")?.trim();
  if (!rawUrl) {
    return NextResponse.json({ message: "Missing image URL." }, { status: 400 });
  }

  const sourceUrl = parseAllowedBuilderImageUrl(rawUrl, context.organizationId);
  if (!sourceUrl) {
    return NextResponse.json(
      { message: "Image URL is not allowed for this organization." },
      { status: 403 },
    );
  }

  const response = await fetch(sourceUrl, { cache: "no-store" });
  if (!response.ok) {
    return NextResponse.json(
      { message: "Unable to load builder image." },
      { status: response.status },
    );
  }

  const contentType = response.headers.get("content-type") ?? "image/png";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json(
      { message: "The requested asset is not an image." },
      { status: 400 },
    );
  }

  return new NextResponse(response.body, {
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Type": contentType,
    },
  });
}
