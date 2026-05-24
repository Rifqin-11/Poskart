export type PricingProduct = {
  id: string;
  name: string;
  price: number;
  promoPrice?: number;
  printLimit: number;
  qrisDownload: boolean;
  gifEnabled: boolean;
  active: boolean;
};
