-- Repair migration for deployments where the original gallery experience
-- migration was already marked as applied before the style column existed.
alter table public.organizations
  add column if not exists gallery_unboxing_enabled boolean not null default true,
  add column if not exists gallery_unboxing_style text not null default 'packaging';

do $$
begin
  alter table public.organizations
    add constraint organizations_gallery_unboxing_style_check
    check (gallery_unboxing_style in ('packaging', 'envelope'));
exception when duplicate_object then null;
end $$;

comment on column public.organizations.gallery_unboxing_style is
  'Public gallery unboxing visual style: packaging or envelope.';
