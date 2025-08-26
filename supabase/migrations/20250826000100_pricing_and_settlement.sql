-- Pricing and subscription settlement
-- Assumptions:
-- - Table reservations has: id, user_id, park_id, date, start_time, duration, reservation_type, is_subscription boolean, total_amount numeric, status
-- - Active subscriptions are tracked in view/table stripe_user_subscriptions (user_id, status, current_period_start, current_period_end)

create or replace function public.fn_is_active_subscription(p_user uuid, p_at timestamptz)
returns boolean language sql stable as $$
  select exists (
    select 1 from stripe_user_subscriptions s
    where (s.user_id = p_user or s.customer_id = p_user::text)
      and s.status = 'active'
      and (p_at between to_timestamp(s.current_period_start) and to_timestamp(s.current_period_end))
  );
$$;

create or replace function public.fn_compute_reservation_amount(p_user uuid, p_type text, p_duration numeric, p_date date, p_start time)
returns numeric language plpgsql stable as $$
declare
  v_is_sub boolean;
  v_amount numeric := 0;
begin
  v_is_sub := public.fn_is_active_subscription(p_user, (p_date::timestamptz + p_start));

  if lower(coalesce(p_type,'daypass')) in ('daypass','1day','day_pass') then
    v_amount := 800; -- flat
  elsif lower(coalesce(p_type,'whole_facility')) in ('whole_facility','private','rental') then
    if v_is_sub then
      v_amount := 4400 * coalesce(p_duration,1) * 0.7; -- 30% off
    else
      v_amount := 4400 * coalesce(p_duration,1);
    end if;
  elsif lower(p_type) = 'subscription' then
    -- subscription entries themselves carry 0 here; they will be settled monthly
    v_amount := 0;
  else
    v_amount := 0;
  end if;

  return round(v_amount);
end;$$;

-- Trigger: set provisional amount on insert/update
create or replace function public.trg_reservations_set_amount()
returns trigger language plpgsql as $$
begin
  if new.total_amount is null then
    new.total_amount := public.fn_compute_reservation_amount(new.user_id, new.reservation_type, new.duration, new.date, new.start_time);
  end if;
  return new;
end;$$;

drop trigger if exists trg_reservations_set_amount on public.reservations;
create trigger trg_reservations_set_amount
before insert or update of reservation_type, duration, date, start_time, user_id on public.reservations
for each row execute function public.trg_reservations_set_amount();

-- Monthly settlement for subscriptions
-- Calculates per-subscriber unit price: 3800 / unique usage days in month (count distinct date per day across all parks)
-- Writes settled amount into reservations that were provisional (type whole_facility/daypass used by subscriber) and marks as settled
create or replace function public.rpc_settle_subscription_month(p_year int, p_month int)
returns table(user_id uuid, unit_price numeric, usage_days int, total_settled numeric) language plpgsql as $$
declare
  v_start date := make_date(p_year, p_month, 1);
  v_end date := (v_start + interval '1 month - 1 day')::date;
begin
  return query
  with sub_users as (
    select distinct s.user_id
    from stripe_user_subscriptions s
    where s.status = 'active'
      and to_timestamp(s.current_period_end) >= v_start
      and to_timestamp(s.current_period_start) <= (v_end + 1)
  ),
  usage as (
    select r.user_id, count(distinct r.date) as days
    from reservations r
    join sub_users su on su.user_id = r.user_id
    where r.date between v_start and v_end
    group by r.user_id
  ),
  unit as (
    select u.user_id, case when u.days > 0 then 3800.0 / u.days else 0 end as unit_price, u.days
    from usage u
  ),
  settle as (
    update reservations r
    set total_amount = case
        when lower(coalesce(r.reservation_type,'')) in ('daypass','1day','day_pass') then 800
        when lower(coalesce(r.reservation_type,'')) in ('whole_facility','private','rental')
          then (select round((u.unit_price * coalesce(r.duration,1))::numeric,0) from unit u where u.user_id = r.user_id)
        else coalesce(r.total_amount,0)
      end
    from unit u
    where r.user_id = u.user_id
      and r.date between v_start and v_end
    returning r.user_id, r.total_amount
  )
  select u.user_id, round(u.unit_price,0) as unit_price, u.days as usage_days,
         coalesce((select sum(s.total_amount) from settle s where s.user_id = u.user_id),0) as total_settled
  from unit u;
end;$$;


