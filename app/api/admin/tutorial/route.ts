import { NextResponse } from "next/server";
import { getAdminContext, getAdminMembership } from "@/server/admin/context";

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

export async function GET(request: Request) {
  try {
    const scope = getTutorialScope(request);
    const [{ supabase, user }, membership] = await Promise.all([
      getAdminContext(),
      getAdminMembership(),
    ]);

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
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      completed: Boolean(
        data?.[TUTORIAL_COLUMNS[scope] as keyof typeof data],
      ),
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to load tutorial progress." },
      { status: 401 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const scope = getTutorialScope(request);
    const [{ supabase, user }, membership] = await Promise.all([
      getAdminContext(),
      getAdminMembership(),
    ]);

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
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ completed: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to save tutorial progress." },
      { status: 401 },
    );
  }
}
