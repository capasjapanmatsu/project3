/*
  # Remove PayPay Support

  1. Tables to drop
    - `paypay_payments` - PayPay payment records
    - `paypay_user_links` - PayPay account links
  
  2. Updates
    - Remove 'paypay' from payment_method enum constraints
    - Update payment methods to Stripe only
  
  3. Functions to drop
    - PayPay related functions
*/

-- Drop PayPay related tables
DROP TABLE IF EXISTS paypay_payments CASCADE;
DROP TABLE IF EXISTS paypay_user_links CASCADE;

-- Drop PayPay related functions
DROP FUNCTION IF EXISTS update_paypay_payment_status(text, text, jsonb);
DROP FUNCTION IF EXISTS update_paypay_payments_updated_at();

-- Update orders table payment_method constraint to remove paypay
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'orders_payment_method_check'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_payment_method_check;
  END IF;
  
  -- Add new constraint without paypay
  ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check 
    CHECK (payment_method = ANY (ARRAY['credit_card'::text, 'bank_transfer'::text, 'cod'::text]));
END $$;

-- Update any existing paypay payment methods to credit_card
UPDATE orders 
SET payment_method = 'credit_card' 
WHERE payment_method = 'paypay';

-- Update reservations table payment_method constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reservations' AND column_name = 'payment_method'
  ) THEN
    -- Update any existing paypay payment methods
    UPDATE reservations 
    SET payment_method = 'credit_card' 
    WHERE payment_method = 'paypay';
  END IF;
END $$;

-- Clean up any PayPay related notifications
DELETE FROM notifications 
WHERE type = 'paypay_payment' 
   OR message LIKE '%PayPay%' 
   OR title LIKE '%PayPay%';

-- Add a comment to indicate PayPay support has been removed
COMMENT ON DATABASE postgres IS 'PayPay support removed on 2025-01-27. Stripe-only payment processing.'; 