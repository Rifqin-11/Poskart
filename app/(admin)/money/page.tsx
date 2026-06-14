import { MoneyDashboard } from "@/features/money/money-dashboard";
import {
  getMoneyCategories,
  getMoneyEntries,
  getMoneyTags,
} from "@/server/money/money-service";

export default async function MoneyPage() {
  const [entries, categories, tags] = await Promise.all([
    getMoneyEntries(),
    getMoneyCategories(),
    getMoneyTags(),
  ]);
  return (
    <MoneyDashboard entries={entries} categories={categories} tags={tags} />
  );
}
