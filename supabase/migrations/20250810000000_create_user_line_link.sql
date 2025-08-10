-- Creates table to link LINE user to app user (optional, minimal)
create table if not exists public.user_line_link (
  line_user_id text primary key,
  user_id uuid,
  name text,
  email text,
  updated_at timestamp with time zone default now()
);

alter table public.user_line_link enable row level security;

-- Allow read for authenticated and anon (adjust later as needed)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_line_link' and policyname = 'select_all_user_line_link'
  ) then
    create policy "select_all_user_line_link" on public.user_line_link for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_line_link' and policyname = 'upsert_admin_only'
  ) then
    create policy "upsert_admin_only" on public.user_line_link for all using (
      auth.role() = 'service_role'
    );
  end if;
end $$;


