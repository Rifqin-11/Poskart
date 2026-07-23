import { MoneyDashboard } from "@/features/money/money-dashboard";
import { requireOrganizationFeatureAccess } from "@/server/admin/organization-feature-access";
import { requireOrganizationSubscriptionAccess } from "@/server/admin/page-access";
import {
  getMoneyCategories,
  getMoneyEntries,
  getMoneyTags,
  getMoneyWallets,
} from "@/server/money/money-service";

export default async function MoneyPage() {
  await requireOrganizationSubscriptionAccess("/money");
  await requireOrganizationFeatureAccess("money");

  const [entries, categories, tags, wallets] = await Promise.all([
    getMoneyEntries(),
    getMoneyCategories(),
    getMoneyTags(),
    getMoneyWallets(),
  ]);
  return (
    <MoneyDashboard
      entries={entries}
      categories={categories}
      tags={tags}
      wallets={wallets}
    />
  );
}
