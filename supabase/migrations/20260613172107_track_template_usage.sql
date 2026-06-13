alter table public.transactions
  add column if not exists template_id text
    references public.templates(id) on delete set null,
  add column if not exists print_count integer
    not null default 0 check (print_count >= 0);

alter table public.templates
  add column if not exists usage_count bigint
    not null default 0 check (usage_count >= 0);

create index if not exists transactions_organization_template_id_idx
  on public.transactions (organization_id, template_id)
  where template_id is not null;

-- Recover historical template usage where a gallery session can be matched
-- unambiguously to a template in the same organization.
update public.transactions as tx
set template_id = template.id
from public.gallery_sessions as session
join public.templates as template
  on template.organization_id = session.organization_id
 and lower(trim(template.name)) = lower(trim(session.template_name))
where tx.id = session.id
  and tx.organization_id = session.organization_id
  and tx.template_id is null;

-- Move legacy kiosk print metadata out of POS before removing the duplicated
-- POS rows created by the old combined transaction endpoint.
update public.transactions as tx
set print_count = sale.print_count
from public.pos_sales as sale
where sale.organization_id = tx.organization_id
  and sale.notes is not null
  and split_part(sale.notes, ' / ', 1) = tx.id;

delete from public.pos_sales as sale
using public.transactions as tx
where sale.organization_id = tx.organization_id
  and sale.notes is not null
  and split_part(sale.notes, ' / ', 1) = tx.id;

update public.templates as template
set usage_count = (
  select count(*)
  from public.transactions as tx
  where tx.template_id = template.id
);

create or replace function public.sync_template_usage_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.template_id is not null then
      update public.templates
      set usage_count = usage_count + 1
      where id = new.template_id;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.template_id is not null then
      update public.templates
      set usage_count = greatest(usage_count - 1, 0)
      where id = old.template_id;
    end if;
    return old;
  end if;

  if old.template_id is distinct from new.template_id then
    if old.template_id is not null then
      update public.templates
      set usage_count = greatest(usage_count - 1, 0)
      where id = old.template_id;
    end if;
    if new.template_id is not null then
      update public.templates
      set usage_count = usage_count + 1
      where id = new.template_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists transactions_sync_template_usage_count
  on public.transactions;
create trigger transactions_sync_template_usage_count
after insert or update of template_id or delete
on public.transactions
for each row execute function public.sync_template_usage_count();
