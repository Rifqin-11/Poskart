import { ExperiencePage } from "@/features/admin/experience/experience-page";
import { requireOrganizationMembershipAccess } from "@/server/admin/page-access";

export default async function ExperienceRoute() {
  await requireOrganizationMembershipAccess();
  return <ExperiencePage />;
}
