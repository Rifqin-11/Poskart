import type { PosSaleFilters } from "@/types/pos";

export const POS_SALE_PAGE_SIZE = 10;

export const DEFAULT_POS_SALE_FILTERS = {
  page: 1,
  pageSize: POS_SALE_PAGE_SIZE,
  search: "",
  packageCode: "all",
  paymentMethod: "all",
  date: "",
} satisfies PosSaleFilters;
