-- 都道府県別掲示板のテーブル
create table if not exists public.pref_threads (
  id uuid primary key default gen_random_uuid(),
  prefecture text not null,
  title text not null,
  content text null,
  allow_dm boolean not null default true,
  author_id uuid not null references public.profiles(id) on delete cascade,
  dog_name text null,
  created_at timestamptz not null default now()
);
alter table public.pref_threads enable row level security;
create policy pref_threads_select on public.pref_threads for select using (true);
create policy pref_threads_insert on public.pref_threads for insert to authenticated with check (author_id = auth.uid());

create table if not exists public.pref_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.pref_threads(id) on delete cascade,
  content text not null,
  image_url text null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.pref_replies enable row level security;
create policy pref_replies_select on public.pref_replies for select using (true);
create policy pref_replies_insert on public.pref_replies for insert to authenticated with check (author_id = auth.uid());

