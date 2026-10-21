"use server";

import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { calculateSubscriptionTotal } from '@/lib/constants/business';
import { getPublicSubscriptionPricingPlans } from '@/server/subscription/pricing';
import { quoteSubscriptionPromotion } from '@/server/subscription/promotions';
import { getSubscriptionPaymentUrl, type SubscriptionPayment } from '@/features/billing/subscription/payment-types';
import { subscriptionPaymentColumns } from '@/server/subscription/payment-reconciliation';

export async function previewSubscriptionPromotion(code: string, planId: string, deviceCount: number) {
  try {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('Silakan masuk terlebih dahulu.');
    const { data: member, error } = await db.from('organization_members').select('organization_id').eq('profile_id', user.id).limit(1).maybeSingle();
    if (error || !member) throw new Error('Organization tidak ditemukan.');
    const plan = (await getPublicSubscriptionPricingPlans(db)).find((item) => item.id === planId);
    if (!plan) throw new Error('Paket tidak tersedia.');
    const quote = calculateSubscriptionTotal(plan, deviceCount);
    const admin = createSupabaseAdminClient();
    // A resumable invoice already owns a quota slot; preview its frozen price.
    const normalizedCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,40}$/.test(normalizedCode)) throw new Error('Kode voucher tidak valid.');
    const { data: previous, error: previousError } = await admin.from('subscription_orders')
      .select(`${subscriptionPaymentColumns},campaign_id,promotion_name,promotion_code,discount_amount`)
      .eq('organization_id', member.organization_id).eq('plan_id', plan.id).eq('device_count', quote.deviceCount)
      .eq('base_amount', quote.baseAmount).eq('additional_device_amount', quote.additionalDeviceAmount)
      .eq('promotion_code', normalizedCode).eq('status', 'pending').not('payment_url', 'is', null)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (previousError) throw new Error('Pembayaran sebelumnya belum dapat diperiksa.');
    if (previous?.campaign_id && getSubscriptionPaymentUrl(previous as SubscriptionPayment)) {
      return { ok: true as const, promotion: { campaignId: previous.campaign_id as string, name: previous.promotion_name as string,
        code: previous.promotion_code as string, discountAmount: previous.discount_amount as number, totalAmount: previous.amount as number } };
    }
    const promotion = await quoteSubscriptionPromotion(admin, normalizedCode, member.organization_id, plan.id, quote.totalAmount);
    return { ok: true as const, promotion };
  } catch (error) {
    return { ok: false as const, message: error instanceof Error ? error.message : 'Voucher tidak dapat diperiksa.' };
  }
}
