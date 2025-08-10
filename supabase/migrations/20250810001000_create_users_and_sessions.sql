create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  line_user_id text unique not null,
  display_name text,
  picture_url text,
  created_at timestamptz default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  expires_at timestamptz
);

alter table public.users enable row level security;
alter table public.sessions enable row level security;

-- Read-only for clients; writes restricted to service_role
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='users' and policyname='users_select_all') then
    create policy users_select_all on public.users for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sessions' and policyname='sessions_select_all') then
    create policy sessions_select_all on public.sessions for select using (true);
  end if;
end $$;


