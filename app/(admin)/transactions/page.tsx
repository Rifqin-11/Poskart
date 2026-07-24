import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { TransactionsMonitoring } from "@/features/admin/transactions";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { DEFAULT_TRANSACTION_FILTERS } from "@/features/admin/transactions/transaction-list-defaults";
import { getQueryClient } from "@/lib/query-client.server";
import { transactionService } from "@/server/admin/transaction-service";
import { requireOrganizationSubscriptionAccess } from "@/server/admin/page-access";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOrganizationSubscriptionAccess("/transactions");
  const params = await searchParams;
  const initialSearch =
    typeof params.search === "string" ? params.search.slice(0, 80) : "";
  const initialAction =
    typeof params.action === "string" ? params.action : undefined;
  const initialFilters = {
    ...DEFAULT_TRANSACTION_FILTERS,
    search: initialSearch,
  };
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: adminQueryKeys.transactions(initialFilters),
    queryFn: () =>
      transactionService.getTransactionsPage(initialFilters),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TransactionsMonitoring
        initialSearch={initialSearch}
        initialAction={initialAction}
      />
    </HydrationBoundary>
  );
}
