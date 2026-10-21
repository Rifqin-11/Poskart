export type SubscriptionCampaign = {
  id: string;
  name: string;
  description: string;
  code: string;
  application_mode: 'voucher' | 'automatic';
  status: 'draft' | 'published' | 'paused' | 'archived';
  starts_at: string;
  ends_at: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  discount_tiers: Array<{ minAmount: number; value: number }>;
  max_discount: number | null;
  min_amount: number;
  plan_ids: string[];
  audience: 'all' | 'new' | 'existing';
  usage_limit: number | null;
  per_organization_limit: number;
  issued?: number;
  paid?: number;
  total_discount?: number;
};

export type SubscriptionPromotionQuote = {
  campaignId: string;
  name: string;
  code: string;
  discountAmount: number;
  totalAmount: number;
};
