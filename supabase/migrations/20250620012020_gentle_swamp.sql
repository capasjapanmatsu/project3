-- Check if table exists before creating
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stripe_customers') THEN
    CREATE TABLE IF NOT EXISTS stripe_customers (
      id bigint primary key generated always as identity,
      user_id uuid references auth.users(id) not null unique,
      customer_id text not null unique,
      created_at timestamp with time zone default now(),
      updated_at timestamp with time zone default now(),
      deleted_at timestamp with time zone default null
    );

    ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Check if policy exists before creating
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'stripe_customers' 
    AND policyname = 'Users can view their own customer data'
  ) THEN
    CREATE POLICY "Users can view their own customer data"
        ON stripe_customers
        FOR SELECT
        TO authenticated
        USING (user_id = auth.uid() AND deleted_at IS NULL);
  END IF;
END $$;

-- Check if type exists before creating
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_type WHERE typname = 'stripe_subscription_status') THEN
    CREATE TYPE stripe_subscription_status AS ENUM (
        'not_started',
        'incomplete',
        'incomplete_expired',
        'trialing',
        'active',
        'past_due',
        'canceled',
        'unpaid',
        'paused'
    );
  END IF;
END $$;

-- Check if table exists before creating
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stripe_subscriptions') THEN
    CREATE TABLE IF NOT EXISTS stripe_subscriptions (
      id bigint primary key generated always as identity,
      customer_id text unique not null,
      subscription_id text default null,
      price_id text default null,
      current_period_start bigint default null,
      current_period_end bigint default null,
      cancel_at_period_end boolean default false,
      payment_method_brand text default null,
      payment_method_last4 text default null,
      status stripe_subscription_status not null,
      created_at timestamp with time zone default now(),
      updated_at timestamp with time zone default now(),
      deleted_at timestamp with time zone default null
    );

    ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Check if policy exists before creating
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'stripe_subscriptions' 
    AND policyname = 'Users can view their own subscription data'
  ) THEN
    CREATE POLICY "Users can view their own subscription data"
        ON stripe_subscriptions
        FOR SELECT
        TO authenticated
        USING (
            customer_id IN (
                SELECT customer_id
                FROM stripe_customers
                WHERE user_id = auth.uid() AND deleted_at IS NULL
            )
            AND deleted_at IS NULL
        );
  END IF;
END $$;

-- Check if type exists before creating
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_type WHERE typname = 'stripe_order_status') THEN
    CREATE TYPE stripe_order_status AS ENUM (
        'pending',
        'completed',
        'canceled'
    );
  END IF;
END $$;

-- Check if table exists before creating
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stripe_orders') THEN
    CREATE TABLE IF NOT EXISTS stripe_orders (
        id bigint primary key generated always as identity,
        checkout_session_id text not null,
        payment_intent_id text not null,
        customer_id text not null,
        amount_subtotal bigint not null,
        amount_total bigint not null,
        currency text not null,
        payment_status text not null,
        status stripe_order_status not null default 'pending',
        created_at timestamp with time zone default now(),
        updated_at timestamp with time zone default now(),
        deleted_at timestamp with time zone default null
    );

    ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Check if policy exists before creating
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'stripe_orders' 
    AND policyname = 'Users can view their own order data'
  ) THEN
    CREATE POLICY "Users can view their own order data"
        ON stripe_orders
        FOR SELECT
        TO authenticated
        USING (
            customer_id IN (
                SELECT customer_id
                FROM stripe_customers
                WHERE user_id = auth.uid() AND deleted_at IS NULL
            )
            AND deleted_at IS NULL
        );
  END IF;
END $$;

-- Drop views if they exist and recreate them
DROP VIEW IF EXISTS stripe_user_subscriptions;
DROP VIEW IF EXISTS stripe_user_orders;

-- View for user subscriptions
CREATE VIEW stripe_user_subscriptions AS
SELECT
    c.customer_id,
    s.subscription_id,
    s.status as subscription_status,
    s.price_id,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    s.payment_method_brand,
    s.payment_method_last4,
    s.status
FROM stripe_customers c
LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL
AND s.deleted_at IS NULL;

GRANT SELECT ON stripe_user_subscriptions TO authenticated;

-- View for user orders
CREATE VIEW stripe_user_orders AS
SELECT
    c.customer_id,
    o.id as order_id,
    o.checkout_session_id,
    o.payment_intent_id,
    o.amount_subtotal,
    o.amount_total,
    o.currency,
    o.payment_status,
    o.status as order_status,
    o.created_at as order_date
FROM stripe_customers c
LEFT JOIN stripe_orders o ON c.customer_id = o.customer_id
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL
AND o.deleted_at IS NULL;

GRANT SELECT ON stripe_user_orders TO authenticated;