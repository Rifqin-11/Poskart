import { MoneyDashboard } from "@/features/money/money-dashboard";
import { getMoneyEntries } from "@/server/money/money-service";

export default async function MoneyPage() {
  return <MoneyDashboard entries={await getMoneyEntries()} />;
}
