update public.organizations
set features = coalesce(features, '{}'::jsonb) || '{"showcase": true}'::jsonb
where coalesce(features -> 'showcase', 'false'::jsonb) <> 'true'::jsonb;
