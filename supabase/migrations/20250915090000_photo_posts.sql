-- Photo posts schema and likes table
create table if not exists public.photo_posts (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  caption text null,
  like_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.photo_posts enable row level security;
create policy photo_posts_select on public.photo_posts for select to authenticated, anon using (true);
create policy photo_posts_insert on public.photo_posts for insert to authenticated with check (user_id = auth.uid());

create table if not exists public.photo_likes (
  photo_id uuid not null references public.photo_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(photo_id, user_id)
);
alter table public.photo_likes enable row level security;
create policy photo_likes_select on public.photo_likes for select to authenticated using (true);
create policy photo_likes_insert on public.photo_likes for insert to authenticated with check (user_id = auth.uid());

-- Trigger to keep like_count in sync
create or replace function public.trg_photo_likes_count()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update public.photo_posts set like_count = like_count + 1 where id = new.photo_id;
  elsif tg_op = 'DELETE' then
    update public.photo_posts set like_count = greatest(like_count - 1, 0) where id = old.photo_id;
  end if;
  return null;
end $$;

drop trigger if exists trg_photo_likes_count on public.photo_likes;
create trigger trg_photo_likes_count after insert or delete on public.photo_likes
for each row execute function public.trg_photo_likes_count();

-- RPC to award like points (1P, per photo per user)
create or replace function public.rpc_award_photo_like(p_user uuid, p_photo_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_exists boolean; begin
  select exists (
    select 1 from public.points_ledger
    where user_id = p_user and source = 'photo_like' and reference_id = p_photo_id::text
  ) into v_exists;
  if v_exists then return 'already_awarded'; end if;
  perform public.fn_add_points(p_user, 1, 'earn', 'photo_like', '写真にいいね(+1P)', 'photo_like', p_photo_id::text);
  return 'success';
end $$;


