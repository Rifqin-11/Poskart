create table if not exists public.product_feedback (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique default (
    'FB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  organization_id text not null references public.organizations(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  submitter_email text not null,
  organization_name text not null,
  category text not null
    check (category in ('criticism', 'suggestion', 'bug', 'other')),
  subject text not null check (char_length(subject) between 5 and 120),
  message text not null check (char_length(message) between 20 and 4000),
  feature_area text,
  page_url text,
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'planned', 'completed', 'closed')),
  admin_note text check (admin_note is null or char_length(admin_note) <= 2000),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_feedback_submitter_created_idx
  on public.product_feedback (submitted_by, created_at desc);

create index if not exists product_feedback_status_created_idx
  on public.product_feedback (status, created_at desc);

create index if not exists product_feedback_organization_created_idx
  on public.product_feedback (organization_id, created_at desc);

create or replace function public.set_product_feedback_submitter_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.submitted_by := auth.uid();

  select profile.email
    into new.submitter_email
  from public.profiles profile
  where profile.id = auth.uid();

  select organization.name
    into new.organization_name
  from public.organizations organization
  where organization.id = new.organization_id;

  if new.submitter_email is null or new.organization_name is null then
    raise exception 'Unable to resolve feedback submitter identity';
  end if;

  new.status := 'new';
  new.admin_note := null;
  new.reviewed_by := null;
  new.reviewed_at := null;
  return new;
end;
$$;

revoke execute on function public.set_product_feedback_submitter_snapshot()
  from public, anon, authenticated;

drop trigger if exists set_product_feedback_submitter_snapshot
  on public.product_feedback;
create trigger set_product_feedback_submitter_snapshot
  before insert on public.product_feedback
  for each row execute function public.set_product_feedback_submitter_snapshot();

alter table public.product_feedback enable row level security;

drop policy if exists "Users can submit product feedback"
  on public.product_feedback;
create policy "Users can submit product feedback"
  on public.product_feedback for insert to authenticated
  with check (
    submitted_by = auth.uid()
    and status = 'new'
    and admin_note is null
    and reviewed_by is null
    and reviewed_at is null
    and exists (
      select 1
      from public.organization_members member
      where member.organization_id = product_feedback.organization_id
        and member.profile_id = auth.uid()
    )
  );

drop policy if exists "Users can view their own product feedback"
  on public.product_feedback;
create policy "Users can view their own product feedback"
  on public.product_feedback for select to authenticated
  using (submitted_by = auth.uid() or public.is_auth_admin());

drop policy if exists "Super admins can update product feedback"
  on public.product_feedback;
create policy "Super admins can update product feedback"
  on public.product_feedback for update to authenticated
  using (public.is_auth_admin())
  with check (public.is_auth_admin());

grant select, insert, update on public.product_feedback to authenticated;

comment on table public.product_feedback is
  'Criticism, suggestions, bug reports, and other product feedback submitted from the POSKART admin dashboard.';
