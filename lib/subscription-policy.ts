export type SubscriptionPolicyInput = {
  status?: string | null;
  current_period_end?: string | null;
};

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
