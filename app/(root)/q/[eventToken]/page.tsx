import { notFound } from "next/navigation";
import { QueueFooter } from "@/features/public/queue/queue-footer";
import { QueueRegistrationForm } from "@/features/public/queue/queue-registration-form";
import { getPublicQueueEvent } from "@/server/queue/public-queue-service";

export default async function PublicQueuePage({
  params,
}: {
  params: Promise<{ eventToken: string }>;
}) {
  const { eventToken } = await params;
  const { event } = await getPublicQueueEvent(eventToken);

  if (!event) notFound();

  return (
    <>
      <main className="min-h-dvh overflow-x-hidden bg-zinc-100 px-3 py-4 text-zinc-950 sm:px-4 sm:py-8">
        <div className="mx-auto w-full max-w-md">
          <section className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
              POSKART Queue
            </div>
            <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight">
              {event.name}
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              {event.description ||
                `Register your details for ${event.organizationName}. You will receive a queue number after submitting this form.`}
            </p>

            <div className="mt-6 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
              Fill in your contact details, keep the ticket QR, then wait until
              your queue number is called by the cashier.
            </div>

            <div className="mt-6">
              <QueueRegistrationForm eventToken={event.publicToken} />
            </div>
          </section>
        </div>
      </main>
      <QueueFooter />
    </>
  );
}
