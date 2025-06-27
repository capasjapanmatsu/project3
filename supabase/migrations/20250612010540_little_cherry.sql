-- Add status field to stripe_subscription_status enum if it doesn't already include 'paused'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid 
                  WHERE t.typname = 'stripe_subscription_status' AND e.enumlabel = 'paused') THEN
        ALTER TYPE stripe_subscription_status ADD VALUE 'paused';
    END IF;
END$$;

-- Update the stripe_user_subscriptions view to include the status field
CREATE OR REPLACE VIEW stripe_user_subscriptions AS
SELECT
  ss.customer_id,
  ss.subscription_id,
  ss.status AS subscription_status,
  ss.price_id,
  ss.current_period_start,
  ss.current_period_end,
  ss.cancel_at_period_end,
  ss.payment_method_brand,
  ss.payment_method_last4,
  ss.status
FROM
  stripe_subscriptions ss
JOIN
  stripe_customers sc ON ss.customer_id = sc.customer_id
WHERE
  sc.deleted_at IS NULL
  AND ss.deleted_at IS NULL;

-- Create a function to handle subscription pause
CREATE OR REPLACE FUNCTION handle_subscription_pause()
RETURNS TRIGGER AS $$
BEGIN
  -- If the status is being changed to 'paused'
  IF NEW.status = 'paused' AND OLD.status != 'paused' THEN
    -- Create a notification for the user
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      read
    )
    SELECT
      sc.user_id,
      'subscription_paused',
      'サブスクリプションが一時停止されました',
      '現在の期間が終了後、サブスクリプションは一時停止されます。いつでも再開できます。',
      jsonb_build_object(
        'subscription_id', NEW.subscription_id,
        'current_period_end', to_char(to_timestamp(NEW.current_period_end), 'YYYY-MM-DD')
      ),
      false
    FROM
      stripe_customers sc
    WHERE
      sc.customer_id = NEW.customer_id
      AND sc.deleted_at IS NULL;
  END IF;
  
  -- If the status is being changed from 'paused' to something else (resuming)
  IF NEW.status != 'paused' AND OLD.status = 'paused' THEN
    -- Create a notification for the user
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      read
    )
    SELECT
      sc.user_id,
      'subscription_resumed',
      'サブスクリプションが再開されました',
      'サブスクリプションが再開されました。すべての特典をご利用いただけます。',
      jsonb_build_object(
        'subscription_id', NEW.subscription_id
      ),
      false
    FROM
      stripe_customers sc
    WHERE
      sc.customer_id = NEW.customer_id
      AND sc.deleted_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger for subscription pause/resume
DROP TRIGGER IF EXISTS subscription_pause_resume_trigger ON stripe_subscriptions;
CREATE TRIGGER subscription_pause_resume_trigger
AFTER UPDATE ON stripe_subscriptions
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION handle_subscription_pause();

-- Add notification types for subscription pause/resume
DO $$
BEGIN
  -- Check if the notifications table has a type column with a check constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'type'
  ) THEN
    -- Alter the check constraint to include the new notification types
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
    
    ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type = ANY (ARRAY[
      'friend_request', 'friend_accepted', 'friend_at_park', 'reservation_reminder', 
      'order_confirmed', 'order_shipped', 'order_delivered', 'qr_shared', 'qr_revoked', 
      'vaccine_expiry_warning', 'vaccine_expired', 'vaccine_reapproval_required', 
      'park_approval_required', 'vaccine_approval_required', 'blacklisted_dog_nearby',
      'subscription_paused', 'subscription_resumed'
    ]));
  END IF;
END$$;