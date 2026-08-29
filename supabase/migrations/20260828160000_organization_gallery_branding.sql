alter table public.organizations
  add column if not exists gallery_branding jsonb not null default '{}'::jsonb;

comment on column public.organizations.gallery_branding is
  'Global public gallery branding defaults for the organization.';
