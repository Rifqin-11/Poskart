import { PayoutDashboard } from "@/features/admin/payout/payout-dashboard";
import {
  getMyPendingSettlementEntries,
  getMyPayoutInvoices,
  getMyPayoutSummary,
} from "@/server/admin/actions/payout-actions";
import { requireOrganizationMembershipAccess } from "@/server/admin/page-access";

export default async function WithdrawPage() {
  await requireOrganizationMembershipAccess();
  const [summary, invoicesPage, pendingSettlementPage] = await Promise.all([
    getMyPayoutSummary(),
    getMyPayoutInvoices({ page: 1, pageSize: 10 }),
    getMyPendingSettlementEntries({ page: 1, pageSize: 20 }),
  ]);

  return (
    <PayoutDashboard
      summary={summary}
      invoicesPage={invoicesPage}
      pendingSettlementPage={pendingSettlementPage}
    />
  );
}
