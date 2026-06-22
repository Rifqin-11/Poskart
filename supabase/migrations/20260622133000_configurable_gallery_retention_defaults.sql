-- Align media retention defaults with the user-facing POSKART policy:
-- share links stay active for 7 days, and Cloudinary gallery assets are
-- eligible for cleanup after 14 days.

alter table public.app_configs
  alter column download_expiry_hours set default 168,
  alter column gallery_retention_days set default 14;

update public.app_configs
set
  download_expiry_hours = case
    when download_expiry_hours = 72 then 168
    else download_expiry_hours
  end,
  gallery_retention_days = case
    when gallery_retention_days = 30 then 14
    else gallery_retention_days
  end,
  updated_at = now()
where id = 'default'
  and (download_expiry_hours = 72 or gallery_retention_days = 30);
