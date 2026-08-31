import { NextResponse } from "next/server";
import { safeApiError } from "@/lib/http/safe-api-error";
import { createClient } from "@/lib/supabase/server";

type TutorialScope =
  | "admin"
  | "builder"
  | "finance"
  | "pricing"
  | "devices"
  | "gallery"
  | "vouchers";

const TUTORIAL_COLUMNS: Record<TutorialScope, string> = {
  admin: "completed_at",
  builder: "builder_completed_at",
  finance: "finance_completed_at",
  pricing: "pricing_completed_at",
  devices: "devices_completed_at",
  gallery: "gallery_completed_at",
  vouchers: "vouchers_completed_at",
};

function getTutorialScope(request: Request): TutorialScope {
  const scope = new URL(request.url).searchParams.get("scope");
  return scope && scope in TUTORIAL_COLUMNS
    ? (scope as TutorialScope)
    : "admin";
}

async function getOptionalTutorialContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? { supabase, user } : null;
}

export async function GET(request: Request) {
  try {
    const scope = getTutorialScope(request);
    const context = await getOptionalTutorialContext();
    if (!context) {
      return NextResponse.json({ completed: false }, { status: 401 });
    }

    const { supabase, user } = context;
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("profile_id", user.id)
      .limit(1)
      .maybeSingle();

    if (membershipError) throw membershipError;

    if (!membership) {
      return NextResponse.json({ message: "Organization not found." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("profile_tutorial_progress")
      .select(
        "completed_at,builder_completed_at,finance_completed_at,pricing_completed_at,devices_completed_at,gallery_completed_at,vouchers_completed_at",
      )
      .eq("profile_id", user.id)
      .maybeSingle();

    if (error) {
      return safeApiError(error, {
        context: "api/admin/tutorial GET",
        message: "Status tutorial belum dapat dimuat.",
      });
    }

    return NextResponse.json({
      completed: Boolean(
        data?.[TUTORIAL_COLUMNS[scope] as keyof typeof data],
      ),
    });
  } catch (error) {
    return safeApiError(error, {
      context: "api/admin/tutorial GET context",
      message: "Sesi atau akses organisasi Anda tidak tersedia.",
      status: 401,
    });
  }
}

export async function PUT(request: Request) {
  try {
    const scope = getTutorialScope(request);
    const context = await getOptionalTutorialContext();
    if (!context) {
      return NextResponse.json({ completed: false }, { status: 401 });
    }

    const { supabase, user } = context;
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("profile_id", user.id)
      .limit(1)
      .maybeSingle();

    if (membershipError) throw membershipError;

    if (!membership) {
      return NextResponse.json({ message: "Organization not found." }, { status: 403 });
    }

    const completedAt = new Date().toISOString();
    const { error } = await supabase
      .from("profile_tutorial_progress")
      .upsert(
        {
          profile_id: user.id,
          [TUTORIAL_COLUMNS[scope]]: completedAt,
        },
        { onConflict: "profile_id" },
      );

    if (error) {
      return safeApiError(error, {
        context: "api/admin/tutorial PUT",
        message: "Status tutorial belum dapat disimpan.",
      });
    }

    return NextResponse.json({ completed: true });
  } catch (error) {
    return safeApiError(error, {
      context: "api/admin/tutorial PUT context",
      message: "Sesi atau akses organisasi Anda tidak tersedia.",
      status: 401,
    });
  }
}
