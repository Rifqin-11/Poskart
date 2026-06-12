alter table public.templates
  add column if not exists display_order integer not null default 0;

with ranked_templates as (
  select
    id,
    row_number() over (
      partition by organization_id
      order by is_default desc, updated_at desc, created_at desc, id
    ) - 1 as next_display_order
  from public.templates
)
update public.templates as templates
set display_order = ranked_templates.next_display_order
from ranked_templates
where templates.id = ranked_templates.id;

create index if not exists templates_organization_display_order_idx
  on public.templates (organization_id, display_order);

create or replace function public.reorder_templates(template_ids text[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_template_id text;
  target_position integer;
begin
  for target_template_id, target_position in
    select template_id, ordinality::integer - 1
    from unnest(template_ids) with ordinality as ordered(template_id, ordinality)
  loop
    update public.templates
    set display_order = target_position
    where id = target_template_id;

    if not found then
      raise exception 'Template % was not found or cannot be reordered', target_template_id;
    end if;
  end loop;
end;
$$;

grant execute on function public.reorder_templates(text[]) to authenticated;
