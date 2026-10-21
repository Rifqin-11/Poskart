"use server";

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { PublicSubscriptionPromotion } from '@/lib/subscription-public-promotions';

// Public marketing projection only: never expose audit actors or tenant orders.
export async function getPublicSubscriptionPromotions(): Promise<PublicSubscriptionPromotion[]> {
  const db = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await db.from('subscription_campaigns')
    .select('id,name,code,application_mode,starts_at,ends_at,discount_type,discount_value,discount_tiers,max_discount,min_amount,plan_ids,audience,usage_limit')
    .eq('status', 'published').lte('starts_at', now).gt('ends_at', now).order('created_at').order('id');
  if (error) throw new Error('Promo belum dapat dimuat.');
  if (!data?.length) return [];
  const { data: stats, error: statsError } = await db.rpc('subscription_campaign_statistics');
  if (statsError) throw new Error('Kuota promo belum dapat diperiksa.');
  const totals = new Map((stats as Array<{ campaign_id: string; issued: number }> ?? []).map((row) => [row.campaign_id, Number(row.issued)]));
  return data.filter((c) => c.usage_limit === null || (totals.get(c.id) ?? 0) < c.usage_limit)
    .map(({ usage_limit, ...campaign }) => {
      void usage_limit;
      return { ...campaign, code: campaign.application_mode === 'voucher' ? campaign.code : null } as PublicSubscriptionPromotion;
    });
}
