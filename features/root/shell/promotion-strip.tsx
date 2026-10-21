"use client";

import { usePublicPromotions } from '@/features/billing/pricing/use-public-promotions';
import { publicPromotionCondition } from '@/lib/subscription-public-promotions';
import { formatCurrency } from '@/lib/utils';

export function PromotionStrip() {
  const campaigns = usePublicPromotions();
  const campaign = campaigns[0];
  if (!campaign) return null;
  const value = Math.max(campaign.discount_value, ...campaign.discount_tiers.map((tier) => tier.value));
  const label = `${campaign.name} · Diskon hingga ${campaign.discount_type === 'percentage' ? `${value}%` : formatCurrency(Math.min(value, campaign.max_discount ?? value))} · ${publicPromotionCondition(campaign)}`;
  return <a href="#pricing" aria-label={label} title={label}
    className="block w-full overflow-x-auto whitespace-nowrap bg-[#00357B] px-4 py-2 text-center text-xs font-medium leading-4 text-white focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white sm:text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {label}<span aria-hidden="true" className="ml-3">Lihat paket →</span>
  </a>;
}
