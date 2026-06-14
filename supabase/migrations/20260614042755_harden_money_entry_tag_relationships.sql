create unique index if not exists money_tags_id_organization_unique_idx
  on public.money_tags (id, organization_id);

create unique index if not exists money_entries_id_organization_unique_idx
  on public.money_entries (id, organization_id);

alter table public.money_entry_tags
  drop constraint if exists money_entry_tags_money_entry_id_fkey;

alter table public.money_entry_tags
  drop constraint if exists money_entry_tags_money_tag_id_fkey;

alter table public.money_entry_tags
  add constraint money_entry_tags_entry_organization_fk
  foreign key (money_entry_id, organization_id)
  references public.money_entries (id, organization_id)
  on delete cascade;

alter table public.money_entry_tags
  add constraint money_entry_tags_tag_organization_fk
  foreign key (money_tag_id, organization_id)
  references public.money_tags (id, organization_id)
  on delete cascade;

notify pgrst, 'reload schema';
