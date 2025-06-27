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