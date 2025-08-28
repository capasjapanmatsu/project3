-- Shop subscriptions support

-- Extend products for subscription options
alter table if exists public.products
  add column if not exists subscription_enabled boolean not null default false,
  add column if not exists subscription_options jsonb not null default '[]'::jsonb;

-- Extend orders to mark subscription-origin orders
alter table if exists public.orders
  add column if not exists is_subscription boolean not null default false,
  add column if not exists subscription_id text null,
  add column if not exists next_billing_date date null;

-- Optional mapping table for Stripe prices to product/options (future use)
create table if not exists public.stripe_product_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  option_id text not null,
  stripe_price_id text not null unique,
  interval_months int not null,
  unit_price integer not null,
  created_at timestamptz not null default now()
);


