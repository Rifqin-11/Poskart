create or replace function public.create_guest_queue_entry(
  p_event_token text,
  p_visitor_name text,
  p_visitor_email text,
  p_visitor_phone text
)
returns table (
  id uuid,
  queue_event_id uuid,
  organization_id text,
  queue_number integer,
  public_token text,
  visitor_name text,
  visitor_email text,
  visitor_phone text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_event public.queue_events%rowtype;
  next_number integer;
  normalized_name text;
  normalized_email text;
  normalized_phone text;
  inserted_entry public.guest_queue_entries%rowtype;
begin
  normalized_name := nullif(trim(coalesce(p_visitor_name, '')), '');
  normalized_email := lower(nullif(trim(coalesce(p_visitor_email, '')), ''));
  normalized_phone := nullif(trim(coalesce(p_visitor_phone, '')), '');

  if normalized_name is null then
    raise exception 'Visitor name is required';
  end if;
  if normalized_email is null or normalized_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Valid visitor email is required';
  end if;
  if normalized_phone is null or normalized_phone !~ '^[0-9]+$' then
    raise exception 'Phone number must use digits only';
  end if;
  if normalized_phone like '0%' then
    raise exception 'Phone number must start with 62, not 0';
  end if;
  if normalized_phone !~ '^62[1-9][0-9]{7,12}$' then
    raise exception 'Valid Indonesian phone number is required';
  end if;

  select qe.*
    into selected_event
  from public.queue_events as qe
  where qe.public_token = p_event_token
    and qe.status = 'active'
    and qe.deleted_at is null
    and (qe.starts_at is null or qe.starts_at <= now())
    and (qe.ends_at is null or qe.ends_at >= now())
  for update;

  if selected_event.id is null then
    raise exception 'Queue event is not available';
  end if;

  next_number := selected_event.last_queue_number + 1;

  update public.queue_events as qe
  set last_queue_number = next_number,
      updated_at = now()
  where qe.id = selected_event.id;

  insert into public.guest_queue_entries (
    organization_id,
    queue_event_id,
    queue_number,
    visitor_name,
    visitor_email,
    visitor_phone
  )
  values (
    selected_event.organization_id,
    selected_event.id,
    next_number,
    normalized_name,
    normalized_email,
    normalized_phone
  )
  returning * into inserted_entry;

  return query
  select
    inserted_entry.id,
    inserted_entry.queue_event_id,
    inserted_entry.organization_id,
    inserted_entry.queue_number,
    inserted_entry.public_token,
    inserted_entry.visitor_name,
    inserted_entry.visitor_email,
    inserted_entry.visitor_phone,
    inserted_entry.created_at;
end;
$$;

revoke execute on function public.create_guest_queue_entry(text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_guest_queue_entry(text, text, text, text) to service_role;

notify pgrst, 'reload schema';
