/*
  # Vaccine Expiry Check Function
  
  1. Functions
    - Create a function to manually run vaccine expiry checks
    - This function can be called by an external scheduler or manually
  
  2. Notes
    - Removed pg_cron dependency for better compatibility
    - Created a standalone function that can be called as needed
*/

-- Create a function to manually run the vaccine expiry check
CREATE OR REPLACE FUNCTION run_vaccine_expiry_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Call the check_vaccine_expiry function
  PERFORM check_vaccine_expiry();
END;
$$;

-- Add a comment explaining how to use this function
COMMENT ON FUNCTION run_vaccine_expiry_check() IS 
'This function checks for expiring vaccine certifications and sends notifications.
It can be called manually or scheduled via an external scheduler.
Example usage: SELECT run_vaccine_expiry_check();';