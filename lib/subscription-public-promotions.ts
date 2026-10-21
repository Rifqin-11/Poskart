export type PublicSubscriptionPromotion = {
  id: string; name: string; code: string | null; application_mode: 'voucher' | 'automatic';
  starts_at: string; ends_at: string; discount_type: 'percentage' | 'fixed'; discount_value: number;
  discount_tiers: Array<{ minAmount: number; value: number }>;
  max_discount: number | null; min_amount: number; plan_ids: string[]; audience: 'all' | 'new' | 'existing';
};

export function publicPromotionDiscount(c: PublicSubscriptionPromotion, planId: string, amount: number, now = Date.now()) {
  if (now < Date.parse(c.starts_at) || now >= Date.parse(c.ends_at) || amount < c.min_amount ||
    (c.plan_ids.length > 0 && !c.plan_ids.includes(planId))) return 0;
  const tier = [...c.discount_tiers].sort((a, b) => b.minAmount - a.minAmount).find((t) => amount >= t.minAmount);
  const value = tier?.value ?? c.discount_value;
  const discount = c.discount_type === 'percentage' ? Math.floor(amount * value / 100) : value;
  return Math.max(0, Math.min(discount, c.max_discount ?? discount, amount - 1));
}

export function bestPublicPromotion(campaigns: PublicSubscriptionPromotion[], planId: string, amount: number) {
  return campaigns.map((campaign) => ({ campaign, discount: publicPromotionDiscount(campaign, planId, amount) }))
    .filter((item) => item.discount > 0).sort((a, b) => b.discount - a.discount)[0] ?? null;
}

export function publicPromotionCondition(c: PublicSubscriptionPromotion) {
  return [c.application_mode === 'voucher' ? `Kode ${c.code}` : 'Otomatis saat checkout',
    c.audience === 'new' ? 'Organisasi baru' : c.audience === 'existing' ? 'Pelanggan lama' : null,
    'Sesuai syarat & kuota'].filter(Boolean).join(' · ');
}
