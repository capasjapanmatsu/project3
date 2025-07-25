/*
  # Fix Payment Processing Issues

  1. New Tables
    - `paypay_user_links` - Links users to their PayPay accounts
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `uaid` (text, unique)
      - `linked_at` (timestamptz)
      - `created_at` (timestamptz)
    - `paypay_payments` - Stores PayPay payment information
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `merchant_payment_id` (text, unique)
      - `order_id` (uuid, references orders)
      - `amount` (integer)
      - `currency` (text)
      - `status` (text)
      - `payment_data` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on both tables
    - Add policies for user access
    - Add admin access policies
*/

-- Create table for PayPay user links if it doesn't exist
CREATE TABLE IF NOT EXISTS paypay_user_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  uaid text NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(uaid)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_paypay_user_links_user_id ON paypay_user_links(user_id);
CREATE INDEX IF NOT EXISTS idx_paypay_user_links_uaid ON paypay_user_links(uaid);

-- Enable RLS on the table
ALTER TABLE paypay_user_links ENABLE ROW LEVEL SECURITY;

-- Create policies for the table (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'paypay_user_links' 
    AND policyname = 'Users can view their own PayPay links'
  ) THEN
    CREATE POLICY "Users can view their own PayPay links"
      ON paypay_user_links
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END
$$;

-- Create table for PayPay payments if it doesn't exist
CREATE TABLE IF NOT EXISTS paypay_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  merchant_payment_id text NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'JPY',
  status text NOT NULL DEFAULT 'pending',
  payment_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(merchant_payment_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_paypay_payments_user_id ON paypay_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_paypay_payments_merchant_payment_id ON paypay_payments(merchant_payment_id);
CREATE INDEX IF NOT EXISTS idx_paypay_payments_order_id ON paypay_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_paypay_payments_status ON paypay_payments(status);

-- Enable RLS on the table
ALTER TABLE paypay_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for the table (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'paypay_payments' 
    AND policyname = 'Users can view their own payments'
  ) THEN
    CREATE POLICY "Users can view their own payments"
      ON paypay_payments
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'paypay_payments' 
    AND policyname = 'Admins can view all payments'
  ) THEN
    CREATE POLICY "Admins can view all payments"
      ON paypay_payments
      FOR SELECT
      TO authenticated
      USING ((auth.jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text);
  END IF;
END
$$;

-- Create a function to update the updated_at timestamp if it doesn't exist
CREATE OR REPLACE FUNCTION update_paypay_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the updated_at timestamp (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_paypay_payments_updated_at'
  ) THEN
    CREATE TRIGGER update_paypay_payments_updated_at
    BEFORE UPDATE ON paypay_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_paypay_payments_updated_at();
  END IF;
END
$$;

-- Add constraint for status values if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'paypay_payments_status_check'
  ) THEN
    ALTER TABLE paypay_payments
    ADD CONSTRAINT paypay_payments_status_check
    CHECK (status IN ('pending', 'authorized', 'completed', 'cancelled', 'failed'));
  END IF;
END
$$;