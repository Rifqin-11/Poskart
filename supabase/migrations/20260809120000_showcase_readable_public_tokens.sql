-- Keep existing showcase links valid while allowing readable slug tokens for new showcases.
alter table public.showcases
  alter column public_token type text using public_token::text;

alter table public.showcases
  alter column public_token set default replace(gen_random_uuid()::text, '-', '');
