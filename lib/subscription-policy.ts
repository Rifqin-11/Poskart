export type SubscriptionPolicyInput = {
  status?: string | null;
  current_period_end?: string | null;
};

export type EffectiveSubscriptionStatus =
  | "active"
  | "trialing"
  | "expired"
  | "invalid"
  | "past_due"
  | "canceled"
  | "free";

export function subscriptionExpiryTime(
  subscription?: SubscriptionPolicyInput | null,
) {
  return subscription?.current_period_end
    ? new Date(subscription.current_period_end).getTime()
    : 0;
}

export function isSubscriptionActive(
  subscription?: SubscriptionPolicyInput | null,
) {
  return (
    ["active", "trialing"].includes(subscription?.status ?? "") &&
    subscriptionExpiryTime(subscription) > Date.now()
  );
}

export function getEffectiveSubscriptionStatus(
  subscription?: SubscriptionPolicyInput | null,
): EffectiveSubscriptionStatus {
  const status = subscription?.status ?? "free";
  const expiry = subscriptionExpiryTime(subscription);

  if (status === "active" || status === "trialing") {
    if (!subscription?.current_period_end || !Number.isFinite(expiry)) {
      return "invalid";
    }
    return expiry > Date.now() ? status : "expired";
  }

  if (status === "past_due") return "past_due";
  if (status === "canceled") return "canceled";
  return "free";
}
