import { VoucherManagement } from "@/features/admin/vouchers/voucher-management";
import { requireOrganizationMembershipAccess } from "@/server/admin/page-access";

export default async function VouchersPage() {
  await requireOrganizationMembershipAccess();
  return <VoucherManagement />;
}
