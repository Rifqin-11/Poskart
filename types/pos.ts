export type PosPackageCode = string;
export type PosPaymentMethod = "Cash" | "QRIS";

export type PosPackageOption = {
  code: PosPackageCode;
  name: string;
  description: string;
  printCount: number;
  amount: number;
  popular?: boolean;
};

export type PosSale = {
  id: string;
  packageCode: PosPackageCode;
  packageName: string;
  printCount: number;
  amount: number;
  paymentMethod: PosPaymentMethod;
  notes: string | null;
  createdAt: string;
};

export type PosSaleFilters = {
  page: number;
  pageSize: number;
  search: string;
  packageCode: string;
  paymentMethod: "all" | PosPaymentMethod;
  date: string;
};

export type PosSalesSummary = {
  revenue: number;
  prints: number;
  transactions: number;
};

export type PosSalesPage = {
  sales: PosSale[];
  total: number;
  page: number;
  pageSize: number;
  summary: PosSalesSummary;
};

export type PosActionState = {
  success: boolean;
  error?: string;
};

export type PosSaleUpdate = {
  saleId: string;
  packageCode: PosPackageCode;
  printCount: number;
  amount: number;
  paymentMethod: PosPaymentMethod;
  notes: string;
};
