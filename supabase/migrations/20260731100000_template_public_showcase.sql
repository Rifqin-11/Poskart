-- Allow each organization to curate a public, tokenized frame showcase.
alter table public.organizations
  add column if not exists showcase_public_token uuid not null default gen_random_uuid();

create unique index if not exists organizations_showcase_public_token_key
  on public.organizations (showcase_public_token);

alter table public.templates
  add column if not exists is_showcase boolean not null default false;

create index if not exists templates_public_showcase_idx
  on public.templates (organization_id, display_order)
  where is_showcase = true and status = 'published';
