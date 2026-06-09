update public.app_configs
set
  share_base_url = 'https://www.poskart.my.id/s',
  updated_at = now()
where id = 'default';
