create table if not exists public.profile_tutorial_progress (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  completed_at timestamptz not null default now()
);

-- Existing accounts should not be interrupted by a tutorial introduced after
-- they already started using POSKART. New accounts have no row and see it once.
insert into public.profile_tutorial_progress (profile_id)
select id from public.profiles
on conflict (profile_id) do nothing;

alter table public.profile_tutorial_progress enable row level security;

drop policy if exists "Users can view their own tutorial progress" on public.profile_tutorial_progress;
create policy "Users can view their own tutorial progress"
  on public.profile_tutorial_progress
  for select
  to authenticated
  using (profile_id = (select auth.uid()));

drop policy if exists "Users can create their own tutorial progress" on public.profile_tutorial_progress;
create policy "Users can create their own tutorial progress"
  on public.profile_tutorial_progress
  for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

drop policy if exists "Users can update their own tutorial progress" on public.profile_tutorial_progress;
create policy "Users can update their own tutorial progress"
  on public.profile_tutorial_progress
  for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

revoke all on public.profile_tutorial_progress from anon;
grant select, insert, update on public.profile_tutorial_progress to authenticated;
