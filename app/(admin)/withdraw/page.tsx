import { PayoutDashboard } from "@/features/admin/payout/payout-dashboard";
import {
  getMyAvailablePayoutLedgerEntries,
  getMyPayoutInvoices,
  getMyPayoutSummary,
} from "@/server/admin/actions/payout-actions";

export default async function WithdrawPage() {
  const [summary, invoices, availableLedgerEntries] = await Promise.all([
    getMyPayoutSummary(),
    getMyPayoutInvoices(),
    getMyAvailablePayoutLedgerEntries(),
  ]);

  return (
    <PayoutDashboard
      summary={summary}
      invoices={invoices}
      availableLedgerEntries={availableLedgerEntries}
    />
  );
}
