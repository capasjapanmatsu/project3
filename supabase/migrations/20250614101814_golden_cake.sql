/*
  # Create owner bank account table

  1. New Tables
    - `owner_bank_accounts`
      - `id` (uuid, primary key)
      - `owner_id` (uuid, foreign key to profiles)
      - `bank_name` (text)
      - `bank_code` (text)
      - `branch_name` (text)
      - `branch_code` (text)
      - `account_type` (text, 'ordinary' or 'checking')
      - `account_number` (text)
      - `account_holder_name` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  2. Security
    - Enable RLS on `owner_bank_accounts` table
    - Add policy for owners to manage their own bank accounts
*/

-- Create owner_bank_accounts table if it doesn't exist
CREATE TABLE IF NOT EXISTS owner_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  bank_code text NOT NULL,
  branch_name text NOT NULL,
  branch_code text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('ordinary', 'checking')),
  account_number text NOT NULL,
  account_holder_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index on owner_id for faster lookups
CREATE INDEX IF NOT EXISTS owner_bank_accounts_owner_id_idx ON owner_bank_accounts(owner_id);

-- Enable row level security
ALTER TABLE owner_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Create policy for owners to manage their own bank accounts
CREATE POLICY "Owners can manage their own bank accounts"
  ON owner_bank_accounts
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Create monthly_payouts table for tracking monthly revenue and payouts
CREATE TABLE IF NOT EXISTS monthly_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  park_id uuid NOT NULL REFERENCES dog_parks(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  total_revenue bigint NOT NULL DEFAULT 0,
  platform_fee bigint NOT NULL DEFAULT 0,
  owner_payout bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed')),
  payout_date timestamptz,
  bank_account_id uuid REFERENCES owner_bank_accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, park_id, year, month)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS monthly_payouts_owner_id_idx ON monthly_payouts(owner_id);
CREATE INDEX IF NOT EXISTS monthly_payouts_park_id_idx ON monthly_payouts(park_id);
CREATE INDEX IF NOT EXISTS monthly_payouts_year_month_idx ON monthly_payouts(year, month);
CREATE INDEX IF NOT EXISTS monthly_payouts_status_idx ON monthly_payouts(status);

-- Enable row level security
ALTER TABLE monthly_payouts ENABLE ROW LEVEL SECURITY;

-- Create policy for owners to view their own payouts
CREATE POLICY "Owners can view their own payouts"
  ON monthly_payouts
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Create policy for admins to manage all payouts
CREATE POLICY "Admins can manage all payouts"
  ON monthly_payouts
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'capasjapan@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'capasjapan@gmail.com');

-- Create function to get monthly revenue by park for admin
CREATE OR REPLACE FUNCTION get_monthly_revenue_by_park(
  start_date_param date,
  end_date_param date
)
RETURNS TABLE (
  owner_id uuid,
  owner_name text,
  park_id uuid,
  park_name text,
  total_revenue bigint,
  bank_name text,
  bank_code text,
  branch_name text,
  branch_code text,
  account_type text,
  account_number text,
  account_holder_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT (auth.jwt() ->> 'email' = 'capasjapan@gmail.com') THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;
  
  RETURN QUERY
  SELECT
    dp.owner_id,
    p.name AS owner_name,
    dp.id AS park_id,
    dp.name AS park_name,
    COALESCE(SUM(r.total_amount), 0)::bigint AS total_revenue,
    oba.bank_name,
    oba.bank_code,
    oba.branch_name,
    oba.branch_code,
    oba.account_type,
    oba.account_number,
    oba.account_holder_name
  FROM
    dog_parks dp
  JOIN
    profiles p ON dp.owner_id = p.id
  LEFT JOIN
    reservations r ON dp.id = r.park_id
      AND r.date BETWEEN start_date_param AND end_date_param
      AND r.status = 'confirmed'
  LEFT JOIN
    owner_bank_accounts oba ON dp.owner_id = oba.owner_id
  WHERE
    dp.status = 'approved'
  GROUP BY
    dp.owner_id, p.name, dp.id, dp.name, 
    oba.bank_name, oba.bank_code, oba.branch_name, oba.branch_code, 
    oba.account_type, oba.account_number, oba.account_holder_name
  ORDER BY
    total_revenue DESC;
END;
$$;