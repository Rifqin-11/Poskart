-- Migration: Subscription plan admin policies
-- Allows authenticated admin UI to manage SaaS subscription plan metadata and
-- public visitors to read public plans when needed by checkout/pricing pages.

alter table public.subscription_plans enable row level security;

drop policy if exists "Public can read public subscription plans" on public.subscription_plans;
drop policy if exists "Authenticated users can manage subscription plans" on public.subscription_plans;

create policy "Public can read public subscription plans"
  on public.subscription_plans for select to anon
  using (is_public = true);

create policy "Authenticated users can manage subscription plans"
  on public.subscription_plans for all to authenticated
  using (true) with check (true);

grant select on public.subscription_plans to anon;
grant select, insert, update, delete on public.subscription_plans to authenticated;
