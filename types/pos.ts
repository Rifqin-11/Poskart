export type PosPackageCode = "print_1" | "print_2" | "print_3";
export type PosPaymentMethod = "Cash" | "QRIS";

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

export type PosActionState = {
  success: boolean;
  error?: string;
};
