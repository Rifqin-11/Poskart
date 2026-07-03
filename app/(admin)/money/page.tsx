import { MoneyDashboard } from "@/features/money/money-dashboard";
import {
  getMoneyCategories,
  getMoneyEntries,
  getMoneyTags,
  getMoneyWallets,
} from "@/server/money/money-service";

export default async function MoneyPage() {
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
