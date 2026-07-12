import { PayoutDashboard } from "@/features/admin/payout/payout-dashboard";
import {
  getMyAvailablePayoutLedgerEntries,
  getMyPayoutInvoices,
  getMyPayoutSummary,
} from "@/server/admin/actions/payout-actions";

export default async function WithdrawPage() {
  const [summary, invoicesPage, availableLedgerEntries] = await Promise.all([
    getMyPayoutSummary(),
    getMyPayoutInvoices({ page: 1, pageSize: 10 }),
    getMyAvailablePayoutLedgerEntries({ page: 1, pageSize: 20 }),
  ]);

  return (
    <PayoutDashboard
      summary={summary}
      invoicesPage={invoicesPage}
      availableLedgerPage={availableLedgerEntries}
    />
  );
}
