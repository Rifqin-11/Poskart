import { FeedbackPage } from "@/features/admin/feedback";
import { requireOrganizationMembershipAccess } from "@/server/admin/page-access";

export default async function ProductFeedbackPage() {
  await requireOrganizationMembershipAccess();
  return <FeedbackPage />;
}
