-- Spots (user-submitted free/photo spots) feature schema
-- This script creates tables, indexes, RLS policies and storage policies.
-- Assumptions:
--  - profiles table exists with column role ('admin' for admins)
--  - PostGIS is optional; we use lat/lng numeric for simplicity
--  - Public read, authenticated write (owner) model

-- Safety
begin;

-- Extensions
create extension if not exists pgcrypto;

-- Helper: is_admin()
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Core tables
create table if not exists public.spots (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null,
  title text not null,
  description text,
  category text,
  categories text[] default '{}',
  tags text[] default '{}',
  latitude double precision,
  longitude double precision,
  address text,
  is_hidden boolean not null default false, -- admin hide
  rating_count int not null default 0,
  rating_sum int not null default 0, -- sum of 1..5
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists spots_author_idx on public.spots(author_id);
create index if not exists spots_created_idx on public.spots(created_at desc);
create index if not exists spots_lat_idx on public.spots(latitude);
create index if not exists spots_lng_idx on public.spots(longitude);

-- keep updated_at current
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_spots_updated_at on public.spots;
create trigger trg_spots_updated_at
before update on public.spots
for each row execute procedure public.set_updated_at();

-- Photos for spots
create table if not exists public.spot_media (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.spots(id) on delete cascade,
  author_id uuid not null,
  url text not null,           -- public URL for rendering
  storage_key text,            -- storage objects.path for cleanup
  width int,
  height int,
  sort_order int,
  is_thumbnail boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists spot_media_spot_idx on public.spot_media(spot_id);
create index if not exists spot_media_created_idx on public.spot_media(spot_id, created_at);

-- Comments
create table if not exists public.spot_comments (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.spots(id) on delete cascade,
  author_id uuid not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);
create index if not exists spot_comments_spot_idx on public.spot_comments(spot_id, created_at);

drop trigger if exists trg_spot_comments_updated_at on public.spot_comments;
create trigger trg_spot_comments_updated_at
before update on public.spot_comments
for each row execute procedure public.set_updated_at();

-- Likes (favorites)
create table if not exists public.spot_likes (
  spot_id uuid not null references public.spots(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (spot_id, user_id)
);

-- Ratings (1..5). Keep aggregate in spots.rating_count/rating_sum
create table if not exists public.spot_ratings (
  spot_id uuid not null references public.spots(id) on delete cascade,
  user_id uuid not null,
  rating int not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (spot_id, user_id)
);

create or replace function public.update_spot_rating_aggregate()
returns trigger language plpgsql as $$
begin
  update public.spots s
  set rating_count = sub.cnt, rating_sum = sub.sum
  from (
    select spot_id, count(*) as cnt, coalesce(sum(rating),0) as sum
    from public.spot_ratings where spot_id = new.spot_id group by spot_id
  ) sub
  where s.id = sub.spot_id;
  return null;
end $$;

drop trigger if exists trg_spot_ratings_aiud on public.spot_ratings;
create trigger trg_spot_ratings_aiud
after insert or update or delete on public.spot_ratings
for each row execute procedure public.update_spot_rating_aggregate();

-- Reports
create table if not exists public.spot_reports (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.spots(id) on delete cascade,
  reporter_id uuid not null,
  reason text not null,
  status text not null default 'open', -- open/closed
  admin_note text,
  created_at timestamptz not null default now()
);
create index if not exists spot_reports_spot_idx on public.spot_reports(spot_id, created_at);

-- Quotas & business rules ----------------------------------------------------
-- 1) First media in a spot becomes thumbnail automatically and is undeletable
create or replace function public.set_first_media_as_thumbnail()
returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from public.spot_media m where m.spot_id = new.spot_id and m.is_thumbnail = true
  ) then
    new.is_thumbnail := true;
  end if;
  return new;
end $$;

drop trigger if exists trg_spot_media_first_thumb on public.spot_media;
create trigger trg_spot_media_first_thumb
before insert on public.spot_media
for each row execute procedure public.set_first_media_as_thumbnail();

-- 2) Per-user max 3 photos per spot
create or replace function public.enforce_three_photos_per_user_per_spot()
returns trigger language plpgsql as $$
declare cnt int;
begin
  select count(*) into cnt from public.spot_media
  where spot_id = new.spot_id and author_id = new.author_id;
  if cnt >= 3 then
    raise exception 'You can upload at most 3 photos per spot';
  end if;
  return new;
end $$;

drop trigger if exists trg_spot_media_limit_per_user on public.spot_media;
create trigger trg_spot_media_limit_per_user
before insert on public.spot_media
for each row execute procedure public.enforce_three_photos_per_user_per_spot();

-- 3) Total cap: 200 photos per spot; delete oldest non-thumbnail when exceeded
create or replace function public.prune_spot_media_total_cap()
returns trigger language plpgsql as $$
declare cnt int;
declare old_id uuid;
begin
  select count(*) into cnt from public.spot_media where spot_id = new.spot_id;
  if cnt > 200 then
    select id into old_id from public.spot_media
    where spot_id = new.spot_id and is_thumbnail = false
    order by created_at asc
    limit 1;
    if old_id is not null then
      delete from public.spot_media where id = old_id;
    end if;
  end if;
  return null; -- AFTER trigger
end $$;

drop trigger if exists trg_spot_media_prune_total on public.spot_media;
create trigger trg_spot_media_prune_total
after insert on public.spot_media
for each row execute procedure public.prune_spot_media_total_cap();

-- RLS -----------------------------------------------------------------------
alter table public.spots enable row level security;
alter table public.spot_media enable row level security;
alter table public.spot_comments enable row level security;
alter table public.spot_likes enable row level security;
alter table public.spot_ratings enable row level security;
alter table public.spot_reports enable row level security;

-- Spots policies
drop policy if exists spots_select on public.spots;
create policy spots_select on public.spots
for select using (
  not is_hidden or public.is_admin()
);

drop policy if exists spots_insert on public.spots;
create policy spots_insert on public.spots
for insert to authenticated with check (
  author_id = auth.uid()
);

drop policy if exists spots_update on public.spots;
create policy spots_update on public.spots
for update using (
  author_id = auth.uid() or public.is_admin()
) with check (
  author_id = auth.uid() or public.is_admin()
);

drop policy if exists spots_delete on public.spots;
create policy spots_delete on public.spots
for delete using (
  author_id = auth.uid() or public.is_admin()
);

-- Media policies
drop policy if exists spot_media_select on public.spot_media;
create policy spot_media_select on public.spot_media
for select using (
  exists (select 1 from public.spots s where s.id = spot_id and (not s.is_hidden or public.is_admin()))
);

drop policy if exists spot_media_insert on public.spot_media;
create policy spot_media_insert on public.spot_media
for insert to authenticated with check (
  author_id = auth.uid()
);

drop policy if exists spot_media_update on public.spot_media;
create policy spot_media_update on public.spot_media
for update using (
  author_id = auth.uid() or public.is_admin()
) with check (
  author_id = auth.uid() or public.is_admin()
);

drop policy if exists spot_media_delete on public.spot_media;
create policy spot_media_delete on public.spot_media
for delete using (
  (author_id = auth.uid() or public.is_admin()) and is_thumbnail = false
);

-- Comments policies
drop policy if exists spot_comments_select on public.spot_comments;
create policy spot_comments_select on public.spot_comments
for select using (
  exists (select 1 from public.spots s where s.id = spot_id and (not s.is_hidden or public.is_admin()))
);

drop policy if exists spot_comments_insert on public.spot_comments;
create policy spot_comments_insert on public.spot_comments
for insert to authenticated with check (
  author_id = auth.uid()
);

drop policy if exists spot_comments_update on public.spot_comments;
create policy spot_comments_update on public.spot_comments
for update using (
  author_id = auth.uid() or public.is_admin()
) with check (
  author_id = auth.uid() or public.is_admin()
);

drop policy if exists spot_comments_delete on public.spot_comments;
create policy spot_comments_delete on public.spot_comments
for delete using (
  author_id = auth.uid() or public.is_admin()
);

-- Likes policies
drop policy if exists spot_likes_select on public.spot_likes;
create policy spot_likes_select on public.spot_likes for select using (true);

drop policy if exists spot_likes_insert on public.spot_likes;
create policy spot_likes_insert on public.spot_likes
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists spot_likes_delete on public.spot_likes;
create policy spot_likes_delete on public.spot_likes
for delete using (user_id = auth.uid() or public.is_admin());

-- Ratings policies
drop policy if exists spot_ratings_select on public.spot_ratings;
create policy spot_ratings_select on public.spot_ratings for select using (true);

drop policy if exists spot_ratings_upsert on public.spot_ratings;
create policy spot_ratings_upsert on public.spot_ratings
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists spot_ratings_update on public.spot_ratings;
create policy spot_ratings_update on public.spot_ratings
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Reports
drop policy if exists spot_reports_select on public.spot_reports;
create policy spot_reports_select on public.spot_reports
for select using (
  public.is_admin() or reporter_id = auth.uid()
);

drop policy if exists spot_reports_insert on public.spot_reports;
create policy spot_reports_insert on public.spot_reports
for insert to authenticated with check (reporter_id = auth.uid());

drop policy if exists spot_reports_update on public.spot_reports;
create policy spot_reports_update on public.spot_reports
for update using (public.is_admin()) with check (public.is_admin());

-- Storage bucket and policies ------------------------------------------------
-- Bucket
insert into storage.buckets (id, name, public)
select 'spot-images', 'spot-images', true
where not exists (
  select 1 from storage.buckets where id = 'spot-images'
);

-- Public read
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Spot images public read'
  ) then
    create policy "Spot images public read" on storage.objects
    for select using (bucket_id = 'spot-images');
  end if;
end $$;

-- Authenticated upload (any path); owner can update/delete; admins too
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Spot images authenticated upload'
  ) then
    create policy "Spot images authenticated upload" on storage.objects
    for insert to authenticated with check (bucket_id = 'spot-images');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Spot images owner update'
  ) then
    create policy "Spot images owner update" on storage.objects
    for update using (bucket_id = 'spot-images' and (owner = auth.uid() or public.is_admin()))
    with check (bucket_id = 'spot-images' and (owner = auth.uid() or public.is_admin()));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Spot images owner delete'
  ) then
    create policy "Spot images owner delete" on storage.objects
    for delete using (bucket_id = 'spot-images' and (owner = auth.uid() or public.is_admin()));
  end if;
end $$;

commit;


