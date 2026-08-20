create table if not exists public.transaction_report_verifications (
  id uuid primary key,
  organization_id text not null references public.organizations(id) on delete cascade,
  exported_by uuid references public.profiles(id) on delete set null,
  issued_at timestamptz not null,
  transaction_count integer not null check (transaction_count >= 0),
  session_count integer not null check (session_count >= 0),
  print_count integer not null check (print_count >= 0),
  profit numeric not null default 0,
  pdf_sha256 text not null check (pdf_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);

create index if not exists transaction_report_verifications_org_created_idx
  on public.transaction_report_verifications (organization_id, created_at desc);

alter table public.transaction_report_verifications enable row level security;

create policy "Organization members can view transaction report verifications"
  on public.transaction_report_verifications for select to authenticated
  using (
    public.is_auth_admin()
    or organization_id in (
      select organization_id from public.organization_members
      where profile_id = auth.uid()
    )
  );

create policy "Organization members can create transaction report verifications"
  on public.transaction_report_verifications for insert to authenticated
  with check (
    public.is_auth_admin()
    or organization_id in (
      select organization_id from public.organization_members
      where profile_id = auth.uid()
    )
  );

grant select, insert on public.transaction_report_verifications to authenticated;
revoke all on public.transaction_report_verifications from anon;
