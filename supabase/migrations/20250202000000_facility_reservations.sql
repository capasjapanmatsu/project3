-- Facility Reservations Schema
-- 1) 設定テーブル: 施設ごとの予約基本設定
create table if not exists public.facility_reservation_settings (
  facility_id uuid primary key references public.pet_facilities(id) on delete cascade,
  enabled boolean not null default false,
  slot_unit_minutes integer not null default 60 check (slot_unit_minutes in (15, 30, 45, 60, 90, 120)),
  allowed_days_ahead integer not null default 90 check (allowed_days_ahead between 1 and 365),
  auto_confirm boolean not null default true,
  capacity_per_slot integer not null default 10 check (capacity_per_slot between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) 客席（任意のコード）
create table if not exists public.facility_seats (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.pet_facilities(id) on delete cascade,
  seat_code text not null,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_facility_seats_facility on public.facility_seats(facility_id);
create unique index if not exists uq_facility_seat_code on public.facility_seats(facility_id, seat_code);

-- 3) 予約テーブル（スロット単位）
create table if not exists public.facility_reservations (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.pet_facilities(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  seat_code text not null,
  reserved_date date not null,
  start_time time not null,
  end_time time not null,
  guest_count integer not null default 1 check (guest_count >= 1 and guest_count <= 20),
  status text not null default 'confirmed' check (status in ('pending','confirmed','cancelled')),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_facility_resv_facility_date on public.facility_reservations(facility_id, reserved_date);
create unique index if not exists uq_facility_resv_slot on public.facility_reservations(facility_id, seat_code, reserved_date, start_time);

-- RLS: 施設オーナーは自施設の設定/座席/予約を参照可能。ユーザーは自分の予約を参照可能。
alter table public.facility_reservation_settings enable row level security;
alter table public.facility_seats enable row level security;
alter table public.facility_reservations enable row level security;

-- Helper: 施設オーナー判定（pet_facilities.owner_id と一致）
create or replace view public.v_facility_owners as
  select id as facility_id, owner_id from public.pet_facilities;

-- Policies
do $$ begin
  -- settings
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'facility_reservation_settings' and policyname = 'owner_select_settings'
  ) then
    create policy owner_select_settings on public.facility_reservation_settings
      for select using (exists (select 1 from public.v_facility_owners o where o.facility_id = facility_id and o.owner_id = auth.uid()));
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'facility_reservation_settings' and policyname = 'owner_upsert_settings'
  ) then
    create policy owner_upsert_settings on public.facility_reservation_settings
      for all using (exists (select 1 from public.v_facility_owners o where o.facility_id = facility_id and o.owner_id = auth.uid()))
      with check (exists (select 1 from public.v_facility_owners o where o.facility_id = facility_id and o.owner_id = auth.uid()));
  end if;

  -- seats
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'facility_seats' and policyname = 'owner_all_seats'
  ) then
    create policy owner_all_seats on public.facility_seats
      for all using (exists (select 1 from public.v_facility_owners o where o.facility_id = facility_id and o.owner_id = auth.uid()))
      with check (exists (select 1 from public.v_facility_owners o where o.facility_id = facility_id and o.owner_id = auth.uid()));
  end if;

  -- reservations: ユーザーは自身の予約を参照・作成、施設オーナーは自施設の予約を参照
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'facility_reservations' and policyname = 'owner_select_resv'
  ) then
    create policy owner_select_resv on public.facility_reservations
      for select using (exists (select 1 from public.v_facility_owners o where o.facility_id = facility_id and o.owner_id = auth.uid()) or user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'facility_reservations' and policyname = 'user_insert_resv'
  ) then
    create policy user_insert_resv on public.facility_reservations
      for insert with check (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'facility_reservations' and policyname = 'user_update_own_resv'
  ) then
    create policy user_update_own_resv on public.facility_reservations
      for update using (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'facility_reservations' and policyname = 'owner_update_resv'
  ) then
    create policy owner_update_resv on public.facility_reservations
      for update using (exists (select 1 from public.v_facility_owners o where o.facility_id = facility_id and o.owner_id = auth.uid()));
  end if;
end $$;

-- Capacity enforcement trigger
create or replace function public.fn_check_reservation_capacity()
returns trigger language plpgsql as $$
declare
  v_capacity integer;
  v_sum integer;
begin
  select capacity_per_slot into v_capacity from public.facility_reservation_settings where facility_id = NEW.facility_id;
  if v_capacity is null then
    return NEW; -- no settings means skip
  end if;
  select coalesce(sum(guest_count),0) into v_sum
    from public.facility_reservations
    where facility_id = NEW.facility_id
      and reserved_date = NEW.reserved_date
      and start_time = NEW.start_time
      and status <> 'cancelled'
      and (TG_OP = 'INSERT' or id <> NEW.id);
  if v_sum + NEW.guest_count > v_capacity then
    raise exception 'Capacity exceeded for the selected time slot (current: %, new: %, capacity: %)', v_sum, NEW.guest_count, v_capacity;
  end if;
  return NEW;
end $$;

drop trigger if exists trg_check_reservation_capacity_ins on public.facility_reservations;
create trigger trg_check_reservation_capacity_ins
  before insert on public.facility_reservations
  for each row execute function public.fn_check_reservation_capacity();

drop trigger if exists trg_check_reservation_capacity_upd on public.facility_reservations;
create trigger trg_check_reservation_capacity_upd
  before update on public.facility_reservations
  for each row execute function public.fn_check_reservation_capacity();


