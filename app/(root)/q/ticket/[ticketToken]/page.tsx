import { notFound } from "next/navigation";
import QRCode from "react-qr-code";
import { Badge } from "@/components/ui/badge";
import { FrameBrowser } from "@/features/public/queue/frame-browser";
import { QueueFooter } from "@/features/public/queue/queue-footer";
import { getSiteUrl } from "@/lib/auth/site-url";
import { getPublicQueueTicketWithFrames } from "@/server/queue/public-queue-service";

export default async function PublicQueueTicketPage({
  params,
}: {
  params: Promise<{ ticketToken: string }>;
}) {
  const { ticketToken } = await params;
  const [{ ticket, templates }, siteUrl] = await Promise.all([
    getPublicQueueTicketWithFrames(ticketToken),
    getSiteUrl(),
  ]);

  if (!ticket) notFound();

  return (
    <>
      <main className="min-h-dvh overflow-x-hidden bg-zinc-100 px-3 py-4 text-zinc-950 sm:px-4 sm:py-8">
        <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
          <section className="w-full overflow-hidden rounded-[32px] border border-zinc-200 bg-white p-5 text-center shadow-sm sm:p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
              Queue Ticket
            </div>
            <h1 className="mt-3 text-xl font-semibold">{ticket.eventName}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {ticket.organizationName}
            </p>

            <div className="mt-6 rounded-[28px] bg-zinc-950 px-4 py-8 text-white">
              <p className="text-sm text-zinc-300">Your queue number</p>
              <div className="mt-2 text-7xl font-black tracking-tight">
                {ticket.queueNumber.toString().padStart(3, "0")}
              </div>
            </div>

            <div className="mx-auto mt-6 w-fit rounded-3xl border border-zinc-200 bg-white p-4">
              <QRCode
                value={`${siteUrl}/q/ticket/${ticket.publicToken}`}
                size={176}
              />
            </div>

            <div className="mt-5 space-y-1 text-left text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">Name</span>
                <span className="font-medium">{ticket.visitorName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">Email</span>
                <span className="truncate font-medium">{ticket.visitorEmail}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">Status</span>
                <Badge variant="secondary" className="capitalize">
                  {ticket.status.replace("_", " ")}
                </Badge>
              </div>
            </div>

            <p className="mt-6 text-xs leading-5 text-zinc-500">
              Keep this screen open or screenshot it. The cashier can validate
              your queue ticket using this QR code.
            </p>
          </section>

          <section className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Available frames
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Browse frame options while waiting for your turn.
              </p>
            </div>

            <FrameBrowser templates={templates} />
          </section>
        </div>
      </main>
      <QueueFooter />
    </>
  );
}
