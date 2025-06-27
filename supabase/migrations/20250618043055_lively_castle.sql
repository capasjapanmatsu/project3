-- Create table for PayPay user links
CREATE TABLE IF NOT EXISTS paypay_user_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uaid text NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(uaid)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_paypay_user_links_user_id ON paypay_user_links(user_id);
CREATE INDEX IF NOT EXISTS idx_paypay_user_links_uaid ON paypay_user_links(uaid);

-- Enable RLS on the table
ALTER TABLE paypay_user_links ENABLE ROW LEVEL SECURITY;

-- Create policies for the table
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

-- Function to get user by PayPay UAID
CREATE OR REPLACE FUNCTION get_user_by_paypay_uaid(
  p_uaid text
) RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_user_data jsonb;
BEGIN
  -- Get user_id from paypay_user_links
  SELECT user_id INTO v_user_id
  FROM paypay_user_links
  WHERE uaid = p_uaid;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No user found with this PayPay account'
    );
  END IF;
  
  -- Get user data
  SELECT jsonb_build_object(
    'id', auth.users.id,
    'email', auth.users.email,
    'name', profiles.name,
    'user_type', profiles.user_type
  ) INTO v_user_data
  FROM auth.users
  JOIN profiles ON auth.users.id = profiles.id
  WHERE auth.users.id = v_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'user', v_user_data
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;