import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { TransactionsMonitoring } from "@/features/admin/transactions";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { DEFAULT_TRANSACTION_FILTERS } from "@/features/admin/transactions/transaction-list-defaults";
import { getQueryClient } from "@/lib/query-client.server";
import { transactionService } from "@/server/admin/transaction-service";

export default async function TransactionsPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: adminQueryKeys.transactions(DEFAULT_TRANSACTION_FILTERS),
    queryFn: () =>
      transactionService.getTransactionsPage(DEFAULT_TRANSACTION_FILTERS),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TransactionsMonitoring />
    </HydrationBoundary>
  );
}
