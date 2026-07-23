import { GalleryPage } from "@/features/admin/gallery/gallery-page";
import { requireOrganizationMembershipAccess } from "@/server/admin/page-access";

export default async function GalleryRoute() {
  await requireOrganizationMembershipAccess();
  return <GalleryPage />;
}
