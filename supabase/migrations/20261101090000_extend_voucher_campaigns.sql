-- Voucher campaigns can be created for up to 90 days and renewed in place.
-- Extension starts at the later of the existing expiry and now, so an expired
-- campaign can be renewed without losing its existing code allocations.

create or replace function public.extend_voucher_campaign(
  p_campaign_id uuid,
  p_extension_days integer
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  current_expiry timestamptz;
  next_expiry timestamptz;
begin
  if p_extension_days not in (30, 90) then
    raise exception 'Voucher extension must be 30 or 90 days.' using errcode = '22023';
  end if;

  select vc.expires_at
    into current_expiry
    from public.voucher_campaigns as vc
   where vc.id = p_campaign_id
     and vc.organization_id in (
       select ids.organization_id
         from public.auth_manageable_organization_ids() as ids
     )
   for update;

  if not found then
    raise exception 'Voucher campaign was not found or is not available.' using errcode = 'P0002';
  end if;

  next_expiry := greatest(coalesce(current_expiry, now()), now())
    + make_interval(days => p_extension_days);

  update public.voucher_campaigns
     set expires_at = next_expiry,
         updated_at = now()
   where id = p_campaign_id;

  return next_expiry;
end;
$$;

revoke execute on function public.extend_voucher_campaign(uuid, integer) from public, anon;
grant execute on function public.extend_voucher_campaign(uuid, integer) to authenticated, service_role;
