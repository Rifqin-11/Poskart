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

export type PosActionState = {
  success: boolean;
  error?: string;
};
