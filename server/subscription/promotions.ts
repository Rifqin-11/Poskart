import type { SupabaseClient } from '@supabase/supabase-js';
import type { SubscriptionPromotionQuote } from '@/types/subscription-campaign';
import { getSubscriptionPaymentUrl, type SubscriptionPayment } from '@/features/billing/subscription/payment-types';
import { subscriptionPaymentColumns } from '@/server/subscription/payment-reconciliation';

export async function quoteSubscriptionPromotion(db: SupabaseClient, code: string, organizationId: string, planId: string, amount: number): Promise<SubscriptionPromotionQuote> {
  if (!/^[A-Z0-9_-]{3,40}$/.test(code.trim().toUpperCase())) throw new Error('Kode voucher tidak valid.');
  const { data, error } = await db.rpc('quote_subscription_campaign', {
    p_code: code.trim().toUpperCase(), p_organization_id: organizationId, p_plan_id: planId, p_amount: amount,
  });
  if (error) throw new Error(error.message);
  return data as SubscriptionPromotionQuote;
}

export async function quoteAutomaticSubscriptionPromotion(db: SupabaseClient, organizationId: string, planId: string, amount: number, deviceCount: number): Promise<SubscriptionPromotionQuote | null> {
  const { data: pending, error: pendingError } = await db.from('subscription_orders')
    .select(`${subscriptionPaymentColumns},campaign_id,promotion_code,promotion_name,discount_amount,base_amount,additional_device_amount,subscription_campaigns!inner(application_mode)`)
    .eq('organization_id', organizationId).eq('plan_id', planId).eq('device_count', deviceCount)
    .eq('subscription_campaigns.application_mode', 'automatic').eq('status', 'pending').not('payment_url', 'is', null)
    .order('created_at', { ascending: false }).limit(20);
  if (pendingError) throw new Error('Pembayaran promo sebelumnya belum dapat diperiksa.');
  const previous = pending?.find((order) => order.base_amount + order.additional_device_amount === amount && getSubscriptionPaymentUrl(order as unknown as SubscriptionPayment));
  if (previous) return { campaignId: previous.campaign_id, name: previous.promotion_name, code: previous.promotion_code,
    discountAmount: previous.discount_amount, totalAmount: previous.amount };
  const { data, error } = await db.rpc('quote_automatic_subscription_campaign', {
    p_organization_id: organizationId, p_plan_id: planId, p_amount: amount,
  });
  if (error) throw new Error('Promo otomatis belum dapat diperiksa. Silakan coba lagi.');
  return data as SubscriptionPromotionQuote | null;
}
