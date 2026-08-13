import { releaseDueEstimatedSettlements } from "@/server/payments/settlement";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  return (
    Boolean(cronSecret) &&
    request.headers.get("authorization") === `Bearer ${cronSecret}`
  );
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await releaseDueEstimatedSettlements();
    return Response.json({ success: true, ...result });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to process payment settlements",
      },
      { status: 500 },
    );
  }
}
