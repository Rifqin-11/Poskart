import { QueueDashboard } from "@/features/admin/queue/queue-dashboard";
import { getSiteUrl } from "@/lib/auth/site-url";
import { getQueueDashboard } from "@/server/admin/actions/queue-actions";
import { requireOrganizationMembershipAccess } from "@/server/admin/page-access";

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  await requireOrganizationMembershipAccess();
  const { event } = await searchParams;
  const [data, siteUrl] = await Promise.all([
    getQueueDashboard(event),
    getSiteUrl(),
  ]);

  return <QueueDashboard data={data} siteUrl={siteUrl} />;
}
