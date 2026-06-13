import { createClient } from "@/lib/supabase/server";

type CancelPrintJobBody = {
  jobId?: string;
};

async function requireOrganization() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership?.organization_id) {
    return {
      error: Response.json(
        { error: "Organization not found" },
        { status: 403 },
      ),
    };
  }

  return {
    supabase,
    organizationId: membership.organization_id,
  };
}

export async function GET() {
  const context = await requireOrganization();
  if ("error" in context) return context.error;

  const { supabase, organizationId } = context;
  const { data: jobs, error } = await supabase
    .from("device_print_jobs")
    .select(
      "id,device_id,gallery_session_id,source_url,copies,status,attempts,requested_at,started_at",
    )
    .eq("organization_id", organizationId)
    .in("status", ["queued", "processing"])
    .order("requested_at", { ascending: true })
    .limit(25);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const deviceIds = [...new Set((jobs ?? []).map((job) => job.device_id))];
  const sessionIds = [
    ...new Set(
      (jobs ?? [])
        .map((job) => job.gallery_session_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [{ data: devices }, { data: sessions }] = await Promise.all([
    deviceIds.length
      ? supabase
          .from("devices")
          .select("id,name")
          .eq("organization_id", organizationId)
          .in("id", deviceIds)
      : Promise.resolve({ data: [] }),
    sessionIds.length
      ? supabase
          .from("gallery_sessions")
          .select("id,template_name")
          .eq("organization_id", organizationId)
          .in("id", sessionIds)
      : Promise.resolve({ data: [] }),
  ]);

  const deviceNames = new Map(
    (devices ?? []).map((device) => [device.id, device.name]),
  );
  const sessionNames = new Map(
    (sessions ?? []).map((session) => [session.id, session.template_name]),
  );

  return Response.json(
    {
      jobs: (jobs ?? []).map((job) => ({
        id: job.id,
        deviceId: job.device_id,
        deviceName: deviceNames.get(job.device_id) ?? job.device_id,
        gallerySessionId: job.gallery_session_id,
        templateName: job.gallery_session_id
          ? sessionNames.get(job.gallery_session_id) || "Photobooth session"
          : "Remote print",
        sourceUrl: job.source_url,
        copies: job.copies,
        status: job.status,
        attempts: job.attempts,
        requestedAt: job.requested_at,
        startedAt: job.started_at,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: Request) {
  const context = await requireOrganization();
  if ("error" in context) return context.error;

  const { supabase, organizationId } = context;
  const body = (await request.json()) as CancelPrintJobBody;
  const jobId = body.jobId?.trim() ?? "";
  if (!jobId) {
    return Response.json({ error: "Job ID is required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("device_print_jobs")
    .update({
      status: "cancelled",
      completed_at: now,
      updated_at: now,
      last_error: "Dibatalkan dari dashboard web.",
    })
    .eq("id", jobId)
    .eq("organization_id", organizationId)
    .eq("status", "queued")
    .select("id")
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return Response.json(
      { error: "Job sudah diproses dan tidak dapat dibatalkan." },
      { status: 409 },
    );
  }

  return Response.json({ success: true });
}
