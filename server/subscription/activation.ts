import type { SupabaseClient } from "@supabase/supabase-js";

export type SubscriptionOrderForActivation = {
  email: string;
  organization_id: string | null;
  profile_id: string | null;
  plan_id: string;
  duration_months: number;
  device_count: number;
};

export async function activatePaidSubscription(
  supabase: SupabaseClient,
  order: SubscriptionOrderForActivation,
) {
  const organizationId = order.organization_id ?? (await findOrganizationId(supabase, order));

  if (!organizationId) {
    return new Error("No organization found for paid subscription order.");
  }

  const periodEnd = addMonths(new Date(), Math.max(1, order.duration_months || 1));
  const { error } = await supabase.from("subscriptions").upsert(
    {
      organization_id: organizationId,
      plan_id: order.plan_id,
      status: "active",
      current_period_end: periodEnd.toISOString(),
      device_limit: Math.max(1, order.device_count || 1),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );

  return error ? new Error(error.message) : null;
}

async function findOrganizationId(
  supabase: SupabaseClient,
  order: SubscriptionOrderForActivation,
) {
  let profileId = order.profile_id;

  if (!profileId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", order.email)
      .maybeSingle();
    profileId = profile?.id ?? null;
  }

  if (!profileId) return null;

  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", profileId)
    .limit(1)
    .maybeSingle();

  return member?.organization_id ?? null;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}
