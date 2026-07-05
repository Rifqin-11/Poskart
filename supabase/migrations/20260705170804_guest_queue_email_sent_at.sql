alter table public.guest_queue_entries
  add column if not exists email_sent_at timestamptz;

notify pgrst, 'reload schema';
