import { consumeSettingsPinReset } from "@/lib/kiosk/settings-pin";

type ConfirmResetBody = {
  token?: string;
  pin?: string;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ConfirmResetBody;
    await consumeSettingsPinReset(body.token ?? "", body.pin ?? "");
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "PIN reset could not be completed.",
      },
      {
        status: 400,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }
}
