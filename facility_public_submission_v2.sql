-- DogParkJP 公開施設登録 v2（一般ユーザー投稿 + オーナー=プレミアム会員）
-- 目的: 一般ユーザーの仮掲載、オーナー（プレミアム）による主導権取得、公開可視化の整理

begin;

-- 1) 追加カラム -------------------------------------------------------------
alter table if exists public.pet_facilities
  add column if not exists is_user_submitted boolean not null default false,
  add column if not exists submitted_by uuid references public.profiles(id) on delete set null,
  add column if not exists verified boolean not null default false,
  add column if not exists official_badge boolean not null default false;

-- 2) オーナー判定（プレミアム会員）関数 ------------------------------------
create or replace function public.is_owner(p_user uuid)
returns boolean
language sql
stable
as $$
  select coalesce(
    -- A. facility_premium_memberships で active/trialing/paused
    exists(
      select 1 from public.facility_premium_memberships m
      where m.owner_id = p_user and m.status in ('active','trialing','paused')
    )
    or
    -- B. stripe_user_subscriptions（アカウントレベル）で active/trialing/paused
    exists(
      select 1 from public.stripe_user_subscriptions s
      where s.user_id = p_user and s.status in ('active','trialing','paused')
    )
    or
    -- C. 旧 user_subscriptions に premium_owner 系があれば
    exists(
      select 1 from public.user_subscriptions us
      where us.user_id = p_user and us.product_key ilike '%premium_owner%'
        and coalesce(us.status,'') in ('active','trialing','paused')
    )
  , false);
$$;

-- 3) 施設クレーム（オーナー主導権取得）RPC ---------------------------------
create or replace function public.claim_facility(p_facility_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not public.is_owner(auth.uid()) then
    raise exception 'Only premium owners can claim facilities';
  end if;

  update public.pet_facilities
    set owner_id = auth.uid(),
        verified = true,
        official_badge = true,
        is_public = coalesce(is_public, true)
  where id = p_facility_id;
end;
$$;
grant execute on function public.claim_facility(uuid) to authenticated;

-- 4) RLS ポリシー整理 -------------------------------------------------------
-- 既存ポリシー競合を避けるため、該当名があれば削除して再作成
drop policy if exists "authenticated_users_can_insert_own_facilities" on public.pet_facilities;
drop policy if exists "public_can_view_approved_facilities" on public.pet_facilities;
drop policy if exists "authenticated_users_can_view_all_facilities" on public.pet_facilities;
drop policy if exists "facility_owners_can_update_own_facilities" on public.pet_facilities;
drop policy if exists "admins_can_manage_all_facilities" on public.pet_facilities;
drop policy if exists "general_users_can_insert_unverified_facilities" on public.pet_facilities;
drop policy if exists "public_can_view_user_submitted_facilities" on public.pet_facilities;

alter table public.pet_facilities enable row level security;

-- A) 一般ユーザー: 仮掲載の新規投稿を許可（オーナーIDなし、未確認、一般投稿）
create policy "general_users_can_insert_unverified_facilities"
  on public.pet_facilities
  for insert to authenticated
  with check (
    is_user_submitted = true
    and verified = false
    and owner_id is null
    and submitted_by = auth.uid()
  );

-- B) オーナー（プレミアム）: 自身の施設を作成可能
create policy "authenticated_users_can_insert_own_facilities"
  on public.pet_facilities
  for insert to authenticated
  with check (
    owner_id = auth.uid()
  );

-- C) 公開表示: 承認済み or 一般ユーザーの仮掲載 も地図に表示
create policy "public_can_view_approved_facilities"
  on public.pet_facilities
  for select to public
  using (
    status = 'approved' or is_user_submitted = true
  );

-- D) 認証済みは全件参照（運用便利のため）
create policy "authenticated_users_can_view_all_facilities"
  on public.pet_facilities
  for select to authenticated
  using (true);

-- E) 更新: オーナー（=owner_id）または管理者のみ
create policy "facility_owners_can_update_own_facilities"
  on public.pet_facilities
  for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- F) 管理者は全操作
create policy "admins_can_manage_all_facilities"
  on public.pet_facilities
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 5) インデックス（参照性向上）
create index if not exists idx_pet_facilities_user_submitted on public.pet_facilities(is_user_submitted, verified);
create index if not exists idx_pet_facilities_submitted_by on public.pet_facilities(submitted_by);

commit;

-- 実行メッセージ
select 'facility_public_submission_v2 applied' as message;


