-- Event organizers can opt out of the kiosk PIN for repeat prints. Existing
-- pricing products retain the protected behavior until explicitly changed.
alter table public.pricing_products
  add column if not exists requires_reprint_password boolean not null default true;

comment on column public.pricing_products.requires_reprint_password is
  'When true, repeat prints for an Event access product require the kiosk Settings PIN.';

notify pgrst, 'reload schema';
