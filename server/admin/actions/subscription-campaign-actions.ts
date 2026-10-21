"use server";

import { requireSuperAdmin } from '@/server/admin/context';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { SubscriptionCampaign } from '@/types/subscription-campaign';

export async function getSubscriptionCampaigns(): Promise<SubscriptionCampaign[]> {
  await requireSuperAdmin();
  const db = createSupabaseAdminClient();
  const { data, error } = await db.from('subscription_campaigns').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const { data: statistics, error: ordersError } = await db.rpc('subscription_campaign_statistics');
  if (ordersError) throw new Error(ordersError.message);
  return (data ?? []).map((campaign) => {
    const totals = (statistics as Array<{ campaign_id: string; issued: number; paid: number; total_discount: number }> | null)?.find((row) => row.campaign_id === campaign.id);
    return { ...campaign, issued: Number(totals?.issued ?? 0), paid: Number(totals?.paid ?? 0),
      total_discount: Number(totals?.total_discount ?? 0) } as SubscriptionCampaign;
  });
}

export async function saveSubscriptionCampaign(input: SubscriptionCampaign): Promise<void> {
  const { user } = await requireSuperAdmin();
  const integer = (value: number | null, min: number, optional = false) => {
    if (optional && value === null) return null;
    if (!Number.isSafeInteger(value) || value! < min || value! > 2_000_000_000) throw new Error('Nilai angka tidak valid.');
    return value!;
  };
  if (!['draft', 'published', 'paused', 'archived'].includes(input.status) ||
      !['percentage', 'fixed'].includes(input.discount_type) || !['all', 'new', 'existing'].includes(input.audience)) throw new Error('Aturan kampanye tidak valid.');
  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  if (!name || name.length > 120 || !/^[A-Z0-9_-]{3,40}$/.test(code)) throw new Error('Nama atau kode voucher tidak valid.');
  const start = new Date(input.starts_at), end = new Date(input.ends_at);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) throw new Error('Periode kampanye tidak valid.');
  if (input.discount_type === 'percentage' && input.discount_value > 100) throw new Error('Diskon maksimal 100%.');
  if (!Array.isArray(input.discount_tiers) || input.discount_tiers.length > 20) throw new Error('Maksimal 20 tingkat diskon.');
  const discountTiers = input.discount_tiers.map((tier) => {
    const minAmount = integer(tier.minAmount, 0)!;
    const value = integer(tier.value, 1)!;
    if (input.discount_type === 'percentage' && value > 100) throw new Error('Diskon maksimal 100%.');
    return { minAmount, value };
  }).sort((a, b) => a.minAmount - b.minAmount);
  if (new Set(discountTiers.map((tier) => tier.minAmount)).size !== discountTiers.length) throw new Error('Minimum tier tidak boleh sama.');
  if (!Array.isArray(input.plan_ids) || input.plan_ids.some((id) => typeof id !== 'string' || id.length > 100)) throw new Error('Target paket tidak valid.');
  const values = { name, code, description: input.description.slice(0, 2000), status: input.status,
    starts_at: start.toISOString(), ends_at: end.toISOString(), discount_type: input.discount_type,
    discount_value: integer(input.discount_value, 1), discount_tiers: discountTiers, max_discount: integer(input.max_discount, 1, true),
    min_amount: integer(input.min_amount, 0), plan_ids: [...new Set(input.plan_ids)], audience: input.audience,
    usage_limit: integer(input.usage_limit, 1, true), per_organization_limit: integer(input.per_organization_limit, 1),
    updated_at: new Date().toISOString(), updated_by: user.id };
  const db = createSupabaseAdminClient();
  const result = input.id
    ? await db.from('subscription_campaigns').update(values).eq('id', input.id).select('id').single()
    : await db.from('subscription_campaigns').insert({ ...values, created_by: user.id }).select('id').single();
  if (result.error) throw new Error(result.error.code === '23505' ? 'Kode voucher sudah digunakan.' : result.error.message);
}

export async function getSubscriptionCampaignAudit(campaignId: string): Promise<Array<{ id: string; actor_id: string | null; created_at: string; before_data: SubscriptionCampaign | null; after_data: SubscriptionCampaign }>> {
  await requireSuperAdmin();
  const { data, error } = await createSupabaseAdminClient().from('subscription_campaign_audit')
    .select('id,actor_id,created_at,before_data,after_data').eq('campaign_id', campaignId)
    .order('created_at', { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}
