alter table public.subscription_campaigns add column application_mode text not null default 'voucher'
  check (application_mode in ('voucher', 'automatic'));

-- Reuse all eligibility, tier and quota rules; internal codes on automatic
-- campaigns identify the invoice snapshot but need not be entered by tenants.
create function public.quote_automatic_subscription_campaign(p_organization_id text, p_plan_id text, p_amount integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c record; q jsonb; best jsonb := null;
begin
  for c in select code from public.subscription_campaigns
    where application_mode = 'automatic' and status = 'published'
      and starts_at <= now() and ends_at > now() order by created_at, id
  loop
    begin
      q := public.quote_subscription_campaign(c.code, p_organization_id, p_plan_id, p_amount);
      if best is null or (q->>'discountAmount')::integer > (best->>'discountAmount')::integer then best := q; end if;
    exception when raise_exception then
      -- Ineligible or exhausted campaigns are not checkout errors.
      null;
    end;
  end loop;
  return best;
end;
$$;
revoke all on function public.quote_automatic_subscription_campaign(text,text,integer) from public, anon, authenticated;
grant execute on function public.quote_automatic_subscription_campaign(text,text,integer) to service_role;
