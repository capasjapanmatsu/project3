-- Points System Schema
-- 1) Tables: points_balances, points_ledger, referrals
-- 2) Core function: fn_add_points (RLS-safe via SECURITY DEFINER)
-- 3) Triggers: welcome 500P on profiles insert; 10% back on reservation paid/completed
-- 4) RPCs: rpc_award_referral, rpc_use_points

create table if not exists public.points_balances (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  entry_type text not null check (entry_type in ('earn','use','adjust')),
  source text not null, -- welcome / referral / reservation / shop
  description text not null,
  points integer not null check (points <> 0), -- + earn, - use
  reference text null, -- e.g. reservation, order, referral
  reference_id text null,
  created_by uuid null,
  constraint points_ledger_points_not_zero check (points <> 0)
);
create index if not exists idx_points_ledger_user_time on public.points_ledger(user_id, occurred_at desc);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user uuid not null references public.profiles(id) on delete cascade,
  referee_user uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  rewarded boolean not null default false,
  constraint referrals_referrer_not_self check (referrer_user <> referee_user),
  constraint referrals_referee_unique unique (referee_user)
);

-- Core function to apply points and keep balance consistent
create or replace function public.fn_add_points(
  p_user uuid,
  p_points integer,
  p_entry_type text,
  p_source text,
  p_description text,
  p_reference text default null,
  p_reference_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  -- Upsert balance row
  insert into public.points_balances(user_id, balance)
  values (p_user, 0)
  on conflict (user_id) do nothing;

  select balance into v_balance from public.points_balances where user_id = p_user for update;

  if p_points < 0 and v_balance + p_points < 0 then
    raise exception 'ポイント残高が不足しています（残高: %, 必要: %）', v_balance, -p_points
      using errcode = 'P0001';
  end if;

  -- Insert ledger
  insert into public.points_ledger(user_id, entry_type, source, description, points, reference, reference_id)
  values (p_user, p_entry_type, p_source, p_description, p_points, p_reference, p_reference_id);

  -- Update balance
  update public.points_balances
    set balance = balance + p_points,
        updated_at = now()
  where user_id = p_user;
end $$;

-- Welcome bonus: 500P on new profile
create or replace function public.trg_profiles_welcome_points()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.fn_add_points(new.id, 500, 'earn', 'welcome', '新規アカウント登録ボーナス', 'welcome', new.id::text);
  return new;
end $$;

drop trigger if exists trg_profiles_welcome_points on public.profiles;
create trigger trg_profiles_welcome_points
after insert on public.profiles
for each row execute function public.trg_profiles_welcome_points();

-- 10% back on reservation payment completion
-- Assumes reservations table includes: id, user_id, total_amount numeric, status
create or replace function public.trg_reservations_points_back()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_points integer;
  v_amount numeric;
begin
  -- Fire only on status transit to paid/completed
  if tg_op = 'INSERT' then
    return new;
  end if;

  if (coalesce(old.status,'') <> coalesce(new.status,''))
     and lower(coalesce(new.status, '')) in ('paid','completed')
     and new.user_id is not null then
    v_amount := coalesce(new.total_amount, 0);
    if v_amount > 0 then
      v_points := round(v_amount * 0.10);
      if v_points > 0 then
        perform public.fn_add_points(new.user_id, v_points, 'earn', 'reservation', 'ドッグラン利用10%還元', 'reservation', new.id::text);
      end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_reservations_points_back on public.reservations;
create trigger trg_reservations_points_back
after update of status on public.reservations
for each row execute function public.trg_reservations_points_back();

-- Referral RPC (awards 500P to both users once per referee)
create or replace function public.rpc_award_referral(p_referrer uuid, p_referee uuid)
returns table(referral_id uuid, referrer_awarded boolean, referee_awarded boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_new boolean := false;
begin
  -- Ensure row exists or create
  insert into public.referrals(referrer_user, referee_user)
  values (p_referrer, p_referee)
  on conflict (referee_user) do nothing;

  select id into v_id from public.referrals where referee_user = p_referee;

  -- Award only if not yet
  update public.referrals set rewarded = true where id = v_id and rewarded = false;
  get diagnostics v_new = row_count > 0;

  if v_new then
    perform public.fn_add_points(p_referrer, 500, 'earn', 'referral', '友達紹介ボーナス（紹介者）', 'referral', v_id::text);
    perform public.fn_add_points(p_referee, 500, 'earn', 'referral', '友達紹介ボーナス（紹介された方）', 'referral', v_id::text);
    return query select v_id, true, true;
  else
    return query select v_id, false, false;
  end if;
end $$;

-- Use points RPC (for shop checkout etc.)
create or replace function public.rpc_use_points(p_user uuid, p_points integer, p_reference text default 'order', p_reference_id text default null)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_points is null or p_points <= 0 then
    raise exception 'ポイント数が不正です' using errcode = 'P0001';
  end if;
  perform public.fn_add_points(p_user, -p_points, 'use', 'shop', 'ポイント利用', p_reference, p_reference_id);
  return true;
end $$;


