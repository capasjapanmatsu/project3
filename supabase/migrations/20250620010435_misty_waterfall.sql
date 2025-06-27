/*
  # Create deployments table

  1. New Tables
    - `deployments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `site_id` (text)
      - `site_name` (text)
      - `deploy_id` (text)
      - `status` (text)
      - `deploy_url` (text)
      - `created_at` (timestamp with time zone)
  2. Security
    - Enable RLS on `deployments` table
    - Add policy for users to view their own deployments
*/

-- Create deployments table
CREATE TABLE IF NOT EXISTS deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  site_id text NOT NULL,
  site_name text NOT NULL,
  deploy_id text NOT NULL,
  status text NOT NULL,
  deploy_url text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_deployments_user_id ON deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_deployments_deploy_id ON deployments(deploy_id);
CREATE INDEX IF NOT EXISTS idx_deployments_site_id ON deployments(site_id);

-- Enable RLS on the table
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

-- Create policies for the table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'deployments' 
    AND policyname = 'Users can view their own deployments'
  ) THEN
    CREATE POLICY "Users can view their own deployments"
      ON deployments
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END
$$;