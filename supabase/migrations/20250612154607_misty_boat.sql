/*
  # Vaccine Expiry Notification System

  1. Functions
    - check_vaccine_expiry - Checks for vaccines expiring in 30 days and sends notifications
    - run_vaccine_expiry_check - Manual trigger function for vaccine expiry checks
  
  2. Notes
    - This migration creates functions to check for expiring vaccine certifications
    - The check_vaccine_expiry function will identify certifications expiring in 30 days
    - Notifications will be sent to owners of dogs with expiring vaccines
    - The run_vaccine_expiry_check function can be called manually or by an external scheduler
*/

-- Create a function to check for expiring vaccines and send notifications
CREATE OR REPLACE FUNCTION check_vaccine_expiry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cert_record RECORD;
  dog_record RECORD;
  owner_id uuid;
  expiry_date date;
  days_until_expiry integer;
BEGIN
  -- Loop through all approved vaccine certifications
  FOR cert_record IN 
    SELECT * FROM vaccine_certifications 
    WHERE status = 'approved' 
    AND expiry_notification_sent = false
  LOOP
    -- Get the earlier of the two expiry dates
    IF cert_record.rabies_expiry_date IS NOT NULL AND cert_record.combo_expiry_date IS NOT NULL THEN
      expiry_date := LEAST(cert_record.rabies_expiry_date, cert_record.combo_expiry_date);
    ELSIF cert_record.rabies_expiry_date IS NOT NULL THEN
      expiry_date := cert_record.rabies_expiry_date;
    ELSIF cert_record.combo_expiry_date IS NOT NULL THEN
      expiry_date := cert_record.combo_expiry_date;
    ELSE
      -- Skip if no expiry dates are set
      CONTINUE;
    END IF;
    
    -- Calculate days until expiry
    days_until_expiry := expiry_date - CURRENT_DATE;
    
    -- If expiring in 30 days or less, send notification
    IF days_until_expiry <= 30 AND days_until_expiry > 0 THEN
      -- Get dog and owner information
      SELECT * INTO dog_record FROM dogs WHERE id = cert_record.dog_id;
      
      IF FOUND THEN
        owner_id := dog_record.owner_id;
        
        -- Insert notification
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          data,
          read
        ) VALUES (
          owner_id,
          'vaccine_expiry_warning',
          dog_record.name || 'のワクチン有効期限が近づいています',
          dog_record.name || 'のワクチン証明書の有効期限が' || days_until_expiry || '日後に切れます。更新をお願いします。',
          jsonb_build_object(
            'dog_id', dog_record.id,
            'dog_name', dog_record.name,
            'expiry_date', expiry_date,
            'days_until_expiry', days_until_expiry
          ),
          false
        );
        
        -- Mark as notified
        UPDATE vaccine_certifications
        SET expiry_notification_sent = true
        WHERE id = cert_record.id;
      END IF;
    END IF;
    
    -- If already expired, mark as expired and require reapproval
    IF days_until_expiry <= 0 THEN
      -- Update certification status
      UPDATE vaccine_certifications
      SET 
        status = 'pending',
        expiry_notification_sent = false
      WHERE id = cert_record.id;
      
      -- Get dog and owner information
      SELECT * INTO dog_record FROM dogs WHERE id = cert_record.dog_id;
      
      IF FOUND THEN
        owner_id := dog_record.owner_id;
        
        -- Insert notification
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          data,
          read
        ) VALUES (
          owner_id,
          'vaccine_expired',
          dog_record.name || 'のワクチン有効期限が切れました',
          dog_record.name || 'のワクチン証明書の有効期限が切れました。新しい証明書をアップロードしてください。',
          jsonb_build_object(
            'dog_id', dog_record.id,
            'dog_name', dog_record.name
          ),
          false
        );
        
        -- Also notify admin
        INSERT INTO admin_notifications (
          type,
          title,
          message,
          data,
          is_read
        ) VALUES (
          'vaccine_approval',
          'ワクチン証明書の再承認が必要です',
          dog_record.name || 'のワクチン証明書の有効期限が切れました。',
          jsonb_build_object(
            'dog_id', dog_record.id,
            'dog_name', dog_record.name,
            'owner_id', owner_id
          ),
          false
        );
      END IF;
    END IF;
  END LOOP;
  
  -- Update last_checked_at for all certifications
  UPDATE vaccine_certifications
  SET last_checked_at = now();
END;
$$;

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

-- Note: This migration creates functions that need to be scheduled
-- You can schedule this using an external cron job or scheduler
-- Example: Call run_vaccine_expiry_check() daily