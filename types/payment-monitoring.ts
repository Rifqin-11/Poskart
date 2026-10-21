export type PaymentMonitorFilters = {
  page: number;
  organizationId: string;
  status: string;
  search: string;
  from: string;
  to: string;
};

export type MonitoredPayment = {
  id: string;
  organizationId: string;
  orderId: string;
  reference: string | null;
  collectionMode: string | null;
  status: string;
  amount: number;
  createdAt: string;
  paidAt: string | null;
  checkedAt: string | null;
  gatewayCode: string | null;
  ledger: {
    id: string; gross: number; fee: number; net: number;
    status: string; hold: string | null;
    settlement: string | null; settlementDate: string | null;
  } | null;
  allocations: Array<{ invoiceId: string; invoiceNumber: string; status: string; gross: number }>;
  warnings: string[];
};
