alter table public.users add column if not exists app_user_id uuid;
create index if not exists users_app_user_id_idx on public.users(app_user_id);

