import type { SupabaseClient } from '@supabase/supabase-js';
import type { SubscriptionPromotionQuote } from '@/types/subscription-campaign';

export async function quoteSubscriptionPromotion(db: SupabaseClient, code: string, organizationId: string, planId: string, amount: number): Promise<SubscriptionPromotionQuote> {
  if (!/^[A-Z0-9_-]{3,40}$/.test(code.trim().toUpperCase())) throw new Error('Kode voucher tidak valid.');
  const { data, error } = await db.rpc('quote_subscription_campaign', {
    p_code: code.trim().toUpperCase(), p_organization_id: organizationId, p_plan_id: planId, p_amount: amount,
  });
  if (error) throw new Error(error.message);
  return data as SubscriptionPromotionQuote;
}
