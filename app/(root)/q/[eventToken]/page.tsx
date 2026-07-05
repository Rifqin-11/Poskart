import { notFound } from "next/navigation";
import { FrameBrowser } from "@/features/public/queue/frame-browser";
import { QueueRegistrationForm } from "@/features/public/queue/queue-registration-form";
import { getPublicQueueEvent } from "@/server/queue/public-queue-service";

export default async function PublicQueuePage({
  params,
}: {
  params: Promise<{ eventToken: string }>;
}) {
  const { eventToken } = await params;
  const { event, templates } = await getPublicQueueEvent(eventToken);

  if (!event) notFound();

  return (
    <main className="min-h-dvh bg-zinc-100 px-4 py-8 text-zinc-950">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
            POSKART Queue
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {event.name}
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            {event.description ||
              `Register your details for ${event.organizationName}. You will receive a queue number after submitting this form.`}
          </p>

          <div className="mt-6 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-sm text-zinc-600">
            Fill in your contact details, keep the ticket QR, then wait until
            your queue number is called by the cashier.
          </div>

          <div className="mt-6">
            <QueueRegistrationForm eventToken={event.publicToken} />
          </div>
        </section>

        <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Available frames
              </h2>
              <p className="text-sm text-zinc-500">
                Browse frame options while waiting for your turn.
              </p>
            </div>
          </div>

          <FrameBrowser templates={templates} />
        </section>
      </div>
    </main>
  );
}
