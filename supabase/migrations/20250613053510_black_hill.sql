/*
  # Create owner verification tables

  1. New Tables
    - `owner_verifications` - Stores identity verification information for dog park owners
  
  2. Security
    - Enable RLS on `owner_verifications` table
    - Add policy for users to manage their own verification data
*/

-- Create owner_verifications table
CREATE TABLE IF NOT EXISTS owner_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  verification_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_verification UNIQUE (user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS owner_verifications_user_id_idx ON owner_verifications(user_id);
CREATE INDEX IF NOT EXISTS owner_verifications_status_idx ON owner_verifications(status);

-- Enable row level security
ALTER TABLE owner_verifications ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own verification data
CREATE POLICY "Users can manage their own verification data"
  ON owner_verifications
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy for admins to view all verification data
CREATE POLICY "Admins can view all verification data"
  ON owner_verifications
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'capasjapan@gmail.com');

-- Function to update verification status
CREATE OR REPLACE FUNCTION update_verification_status(
  user_id_param uuid,
  verification_id_param text,
  status_param text,
  verification_data_param jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the verification exists
  IF EXISTS (SELECT 1 FROM owner_verifications WHERE user_id = user_id_param) THEN
    -- Update existing verification
    UPDATE owner_verifications
    SET 
      status = status_param,
      verification_data = verification_data_param,
      updated_at = now()
    WHERE user_id = user_id_param;
  ELSE
    -- Insert new verification
    INSERT INTO owner_verifications (
      user_id,
      verification_id,
      status,
      verification_data
    ) VALUES (
      user_id_param,
      verification_id_param,
      status_param,
      verification_data_param
    );
  END IF;
  
  RETURN true;
END;
$$;

-- Function to check verification status
CREATE OR REPLACE FUNCTION check_verification_status(user_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  status_val text;
BEGIN
  SELECT status INTO status_val
  FROM owner_verifications
  WHERE user_id = user_id_param;
  
  RETURN COALESCE(status_val, 'not_started');
END;
$$;

-- Trigger to update updated_at on owner_verifications
CREATE OR REPLACE FUNCTION update_owner_verifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_owner_verifications_updated_at
BEFORE UPDATE ON owner_verifications
FOR EACH ROW
EXECUTE FUNCTION update_owner_verifications_updated_at();

-- Function to handle Stripe webhook for identity verification
CREATE OR REPLACE FUNCTION handle_identity_verification_webhook(
  verification_id_param text,
  status_param text,
  verification_data_param jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_val uuid;
BEGIN
  -- Get the user_id from the verification record
  SELECT user_id INTO user_id_val
  FROM owner_verifications
  WHERE verification_id = verification_id_param;
  
  IF user_id_val IS NULL THEN
    RAISE EXCEPTION 'Verification not found';
  END IF;
  
  -- Update the verification status
  UPDATE owner_verifications
  SET 
    status = status_param,
    verification_data = verification_data_param,
    updated_at = now()
  WHERE verification_id = verification_id_param;
  
  -- If verification is successful, update user profile
  IF status_param = 'verified' THEN
    -- Update user profile to mark as verified
    UPDATE profiles
    SET 
      user_type = 'owner',
      updated_at = now()
    WHERE id = user_id_val;
    
    -- Create notification for user
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      user_id_val,
      'verification_complete',
      '本人確認が完了しました',
      'ドッグランオーナーとしての本人確認が完了しました。次のステップに進んでください。',
      jsonb_build_object('verification_id', verification_id_param)
    );
  END IF;
  
  RETURN true;
END;
$$;