import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;
  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership?.organization_id) {
    return NextResponse.json(
      { message: "Organization not found" },
      { status: 403 },
    );
  }

  const organizationId = membership.organization_id;
  const { data: session, error: sessionError } = await supabase
    .from("gallery_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (sessionError) {
    return NextResponse.json(
      { message: sessionError.message },
      { status: 500 },
    );
  }
  if (!session) {
    return NextResponse.json(
      { message: "Gallery session not found" },
      { status: 404 },
    );
  }

  const [
    { data: photos, error: photosError },
    { data: livePhotoJobs, error: jobsError },
  ] = await Promise.all([
    supabase
      .from("gallery_photos")
      .select("id,session_id,kind,photo_index,secure_url,format")
      .eq("session_id", sessionId)
      .eq("organization_id", organizationId)
      .order("photo_index", { ascending: true }),
    supabase
      .from("live_photo_render_jobs")
      .select("session_id,status,updated_at")
      .eq("session_id", sessionId)
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false })
      .limit(1),
  ]);

  if (photosError || jobsError) {
    return NextResponse.json(
      {
        message:
          photosError?.message ??
          jobsError?.message ??
          "Unable to load gallery details",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    photos: photos ?? [],
    livePhotoJob: livePhotoJobs?.[0] ?? null,
  });
}
