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
  const organizationId =
    order.organization_id ?? (await findOrganizationId(supabase, order));

  if (!organizationId) {
    return new Error("No organization found for paid subscription order.");
  }

  const now = new Date();
  const { data: currentSubscription, error: currentSubscriptionError } =
    await supabase
      .from("subscriptions")
      .select("current_period_end")
      .eq("organization_id", organizationId)
      .maybeSingle();
  if (currentSubscriptionError) {
    return new Error(currentSubscriptionError.message);
  }

  const currentPeriodEnd = currentSubscription?.current_period_end
    ? new Date(currentSubscription.current_period_end)
    : null;
  const renewalStart =
    currentPeriodEnd &&
    Number.isFinite(currentPeriodEnd.getTime()) &&
    currentPeriodEnd.getTime() > now.getTime()
      ? currentPeriodEnd
      : now;
  const periodEnd = addMonths(
    renewalStart,
    Math.max(1, order.duration_months || 1),
  );
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

  if (error) return new Error(error.message);

  // Any previous warning belongs to the old expiry date. Future reminder jobs
  // use the new period end, and the old in-app notices should not keep asking
  // an already-renewed owner/admin to extend again.
  await supabase
    .from("admin_notifications")
    .delete()
    .eq("organization_id", organizationId)
    .eq("type", "subscription_expiry_reminder");

  return null;
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
  const day = next.getDate();

  // Avoid JavaScript's 31 Jan + 1 month => early March rollover.
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const lastDayOfTargetMonth = new Date(
    next.getFullYear(),
    next.getMonth() + 1,
    0,
  ).getDate();
  next.setDate(Math.min(day, lastDayOfTargetMonth));
  return next;
}
