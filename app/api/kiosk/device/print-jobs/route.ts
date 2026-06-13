import {
  KioskApiError,
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";

type PrintJobStatusBody = {
  deviceId?: string;
  jobId?: string;
  status?: "printed" | "failed";
  error?: string | null;
};

export async function GET(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const deviceId = new URL(request.url).searchParams.get("deviceId") ?? "";
    const device = await requireOrganizationDevice(context, deviceId);
    const staleBefore = new Date(Date.now() - 5 * 60_000).toISOString();

    const { error: staleFailedError } = await context.client
      .from("device_print_jobs")
      .update({
        status: "failed",
        last_error: "Device tidak menyelesaikan print setelah 3 percobaan.",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", context.organizationId)
      .eq("device_id", device.id)
      .eq("status", "processing")
      .gte("attempts", 3)
      .lt("started_at", staleBefore);
    if (staleFailedError) throw staleFailedError;

    const { error: staleQueueError } = await context.client
      .from("device_print_jobs")
      .update({
        status: "queued",
        started_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", context.organizationId)
      .eq("device_id", device.id)
      .eq("status", "processing")
      .lt("attempts", 3)
      .lt("started_at", staleBefore);
    if (staleQueueError) throw staleQueueError;

    const { data: queued, error: queueError } = await context.client
      .from("device_print_jobs")
      .select("id,gallery_session_id,source_url,copies,attempts,requested_at")
      .eq("organization_id", context.organizationId)
      .eq("device_id", device.id)
      .eq("status", "queued")
      .order("requested_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (queueError) throw queueError;
    if (!queued) return jsonOk({ job: null });

    const now = new Date().toISOString();
    const { data: claimed, error: claimError } = await context.client
      .from("device_print_jobs")
      .update({
        status: "processing",
        attempts: (queued.attempts ?? 0) + 1,
        started_at: now,
        updated_at: now,
        last_error: null,
      })
      .eq("id", queued.id)
      .eq("device_id", device.id)
      .eq("status", "queued")
      .select("id,gallery_session_id,source_url,copies,attempts,requested_at")
      .maybeSingle();
    if (claimError) throw claimError;

    return jsonOk({ job: claimed ?? null });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = (await request.json()) as PrintJobStatusBody;
    const device = await requireOrganizationDevice(
      context,
      body.deviceId ?? "",
    );
    const jobId = body.jobId?.trim() ?? "";
    if (!jobId || (body.status !== "printed" && body.status !== "failed")) {
      throw new KioskApiError(
        "Job ID and final print status are required.",
        400,
        "KIOSK_PRINT_JOB_INVALID",
      );
    }

    const now = new Date().toISOString();
    const { data, error } = await context.client
      .from("device_print_jobs")
      .update({
        status: body.status,
        last_error:
          body.status === "failed"
            ? body.error?.trim() || "Printer gagal mencetak."
            : null,
        completed_at: now,
        updated_at: now,
      })
      .eq("id", jobId)
      .eq("organization_id", context.organizationId)
      .eq("device_id", device.id)
      .eq("status", "processing")
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new KioskApiError(
        "Print job is no longer processing.",
        409,
        "KIOSK_PRINT_JOB_STATE_CONFLICT",
      );
    }

    return jsonOk({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
