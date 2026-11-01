import { VoucherManagement } from "@/features/admin/vouchers/voucher-management";
import { requireOrganizationMembershipAccess } from "@/server/admin/page-access";

export default async function VouchersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOrganizationMembershipAccess();
  const params = await searchParams;
  return (
    <VoucherManagement
      initialOpen={params.action === "generate"}
      initialCampaignId={
        typeof params.campaign === "string" ? params.campaign : undefined
      }
      initialCode={typeof params.code === "string" ? params.code : undefined}
    />
  );
}
