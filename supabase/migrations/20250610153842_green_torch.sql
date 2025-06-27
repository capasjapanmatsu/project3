/*
  # 入場QRシステムのデータベース設定

  1. New Tables
    - `entrance_qr_codes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `dog_id` (uuid, foreign key to dogs)
      - `access_code` (text, unique access code)
      - `payment_type` (text, 'single' or 'subscription')
      - `amount_charged` (integer, amount charged in yen)
      - `valid_until` (timestamptz, expiration time)
      - `status` (text, 'active', 'used', 'expired')
      - `used_at` (timestamptz, when QR was used)
      - `park_id` (uuid, which park was accessed)
      - `created_at` (timestamptz)

    - `payment_cards`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `card_number_masked` (text, masked card number)
      - `card_holder_name` (text)
      - `expiry_month` (integer)
      - `expiry_year` (integer)
      - `card_brand` (text, 'visa', 'mastercard', 'jcb', 'amex')
      - `is_default` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for user access control

  3. Functions
    - Add payment processing function (placeholder)
*/

-- Create entrance_qr_codes table
CREATE TABLE IF NOT EXISTS entrance_qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dog_id uuid NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  access_code text NOT NULL UNIQUE,
  payment_type text NOT NULL CHECK (payment_type IN ('single', 'subscription')),
  amount_charged integer NOT NULL DEFAULT 0 CHECK (amount_charged >= 0),
  valid_until timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  used_at timestamptz,
  park_id uuid REFERENCES dog_parks(id),
  created_at timestamptz DEFAULT now()
);

-- Create payment_cards table
CREATE TABLE IF NOT EXISTS payment_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  card_number_masked text NOT NULL,
  card_holder_name text NOT NULL,
  expiry_month integer NOT NULL CHECK (expiry_month >= 1 AND expiry_month <= 12),
  expiry_year integer NOT NULL CHECK (expiry_year >= 0 AND expiry_year <= 99),
  card_brand text NOT NULL CHECK (card_brand IN ('visa', 'mastercard', 'jcb', 'amex')),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE entrance_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for entrance_qr_codes
CREATE POLICY "Users can manage their own QR codes"
  ON entrance_qr_codes
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for payment_cards
CREATE POLICY "Users can manage their own payment cards"
  ON payment_cards
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS entrance_qr_codes_user_id_idx ON entrance_qr_codes(user_id);
CREATE INDEX IF NOT EXISTS entrance_qr_codes_access_code_idx ON entrance_qr_codes(access_code);
CREATE INDEX IF NOT EXISTS entrance_qr_codes_status_idx ON entrance_qr_codes(status);
CREATE INDEX IF NOT EXISTS entrance_qr_codes_valid_until_idx ON entrance_qr_codes(valid_until);

CREATE INDEX IF NOT EXISTS payment_cards_user_id_idx ON payment_cards(user_id);
CREATE INDEX IF NOT EXISTS payment_cards_is_default_idx ON payment_cards(user_id, is_default);

-- Function to process payment (placeholder for actual payment integration)
CREATE OR REPLACE FUNCTION process_payment(
  user_id uuid,
  amount integer,
  description text,
  payment_method text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This is a placeholder function
  -- In a real implementation, this would integrate with Stripe or other payment processors
  
  -- For now, we'll just return true to simulate successful payment
  -- In production, this would:
  -- 1. Validate the user has a valid payment method
  -- 2. Process the payment through the payment gateway
  -- 3. Handle payment failures appropriately
  -- 4. Log the transaction
  
  RETURN true;
END;
$$;

-- Function to expire old QR codes
CREATE OR REPLACE FUNCTION expire_old_qr_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE entrance_qr_codes
  SET status = 'expired'
  WHERE status = 'active'
    AND valid_until < now();
END;
$$;

-- Function to ensure only one default payment card per user
CREATE OR REPLACE FUNCTION ensure_single_default_card()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If the new/updated card is set as default
  IF NEW.is_default = true THEN
    -- Set all other cards for this user to not default
    UPDATE payment_cards
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for default card management
DROP TRIGGER IF EXISTS ensure_single_default_card_trigger ON payment_cards;
CREATE TRIGGER ensure_single_default_card_trigger
  BEFORE INSERT OR UPDATE ON payment_cards
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_card();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON entrance_qr_codes TO authenticated;
GRANT ALL ON payment_cards TO authenticated;
GRANT EXECUTE ON FUNCTION process_payment TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_qr_codes TO authenticated;