/*
  # Vaccine Expiry Scheduler

  1. Functions
    - Creates a function to check for expiring vaccines
    - Creates a helper function to manually run the check
  
  2. Notes
    - Avoids using pg_cron directly since it may not be available
    - Provides alternative manual execution method
*/

-- Create a function to manually run the vaccine expiry check
CREATE OR REPLACE FUNCTION run_vaccine_expiry_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM check_vaccine_expiry();
END;
$$;

-- Create a comment explaining how to schedule this with pg_cron if available
COMMENT ON FUNCTION run_vaccine_expiry_check() IS 
'This function checks for expiring vaccine certifications and sends notifications.
If pg_cron extension is available, you can schedule it with:
SELECT cron.schedule(''0 0 * * *'', ''SELECT check_vaccine_expiry()'');';

-- Create a trigger to run the check when a vaccine certification is updated
CREATE OR REPLACE FUNCTION check_vaccine_expiry_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only check expiry when status changes to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Update last_checked_at
    NEW.last_checked_at := CURRENT_TIMESTAMP;
    
    -- Check if expiry dates are approaching
    IF NEW.rabies_expiry_date IS NOT NULL AND 
       NEW.rabies_expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND
       NEW.rabies_expiry_date > CURRENT_DATE AND
       NOT NEW.expiry_notification_sent THEN
      
      -- Mark as notified
      NEW.expiry_notification_sent := TRUE;
      
      -- Insert notification for the dog owner
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data,
        read
      )
      SELECT 
        dogs.owner_id,
        'vaccine_expiry_warning',
        'ワクチン証明書の有効期限が近づいています',
        dogs.name || 'ちゃんのワクチン証明書の有効期限が' || 
        to_char(NEW.rabies_expiry_date, 'YYYY年MM月DD日') || 'に切れます。更新をお願いします。',
        jsonb_build_object(
          'dog_id', NEW.dog_id,
          'expiry_date', NEW.rabies_expiry_date,
          'vaccine_type', 'rabies'
        ),
        false
      FROM dogs
      WHERE dogs.id = NEW.dog_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create a trigger to run the check when a vaccine certification is updated
CREATE TRIGGER vaccine_expiry_check_trigger
BEFORE UPDATE ON vaccine_certifications
FOR EACH ROW
EXECUTE FUNCTION check_vaccine_expiry_on_update();