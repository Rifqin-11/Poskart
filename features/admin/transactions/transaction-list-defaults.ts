import type { TransactionListFilters } from "@/server/admin/actions/transaction-actions";

export const TRANSACTION_PAGE_SIZE = 10;

export const DEFAULT_TRANSACTION_FILTERS = {
  page: 1,
  pageSize: TRANSACTION_PAGE_SIZE,
  search: "",
  status: "all",
  paymentMethod: "all",
  packageName: "",
  date: "",
} satisfies TransactionListFilters;
