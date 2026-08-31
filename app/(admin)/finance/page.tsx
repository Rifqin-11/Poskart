import { FinanceDashboard } from "@/features/finance/finance-dashboard";
import { requireOrganizationSubscriptionAccess } from "@/server/admin/page-access";
import {
  getMoneyCategories,
  getMoneyEntries,
  getMoneyTags,
  getMoneyWallets,
} from "@/server/finance/finance-service";

export default async function FinancePage() {
  await requireOrganizationSubscriptionAccess("/finance");

  const [entries, categories, tags, wallets] = await Promise.all([
    getMoneyEntries(),
    getMoneyCategories(),
    getMoneyTags(),
    getMoneyWallets(),
  ]);
  return (
    <FinanceDashboard
      entries={entries}
      categories={categories}
      tags={tags}
      wallets={wallets}
    />
  );
}
