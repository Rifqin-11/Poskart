"use client";

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { getPublicSubscriptionPromotions } from '@/server/subscription/public-promotion-actions';

export function usePublicPromotions() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const query = useQuery({ queryKey: ['public-subscription-promotions'], queryFn: getPublicSubscriptionPromotions,
    staleTime: 15000, refetchInterval: 15000, retry: 1, refetchOnWindowFocus: true });
  // Never keep advertising an expired/exhausted promo when refresh fails.
  return query.isError ? [] : (query.data ?? []).filter((c) => Date.parse(c.starts_at) <= now && Date.parse(c.ends_at) > now);
}
