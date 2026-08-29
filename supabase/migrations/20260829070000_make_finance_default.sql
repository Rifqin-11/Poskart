-- Finance is a core subscription feature, not an organization-level toggle.
update public.organizations
set features = jsonb_set(
  coalesce(features, '{}'::jsonb),
  '{money}',
  'true'::jsonb,
  true
), updated_at = now();
