/*
  # Create pet_facilities table

  This migration creates the pet_facilities table that is used by the 
  AdminFacilityApproval page for managing pet facility applications.
*/

-- Create pet_facilities table if it doesn't exist
CREATE TABLE IF NOT EXISTS pet_facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category_id text NOT NULL CHECK (category_id IN (
    'pet_hotel', 
    'pet_salon', 
    'veterinary', 
    'pet_cafe', 
    'pet_restaurant', 
    'pet_shop', 
    'pet_accommodation'
  )),
  address text NOT NULL,
  phone text,
  website text,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Identity document fields
  identity_document_url text,
  identity_document_filename text,
  identity_status text DEFAULT 'not_submitted' CHECK (identity_status IN ('not_submitted', 'submitted', 'approved', 'rejected')),
  identity_created_at timestamptz,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  rejected_at timestamptz
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pet_facilities_owner_id ON pet_facilities(owner_id);
CREATE INDEX IF NOT EXISTS idx_pet_facilities_status ON pet_facilities(status);
CREATE INDEX IF NOT EXISTS idx_pet_facilities_category_id ON pet_facilities(category_id);
CREATE INDEX IF NOT EXISTS idx_pet_facilities_created_at ON pet_facilities(created_at);
CREATE INDEX IF NOT EXISTS idx_pet_facilities_identity_status ON pet_facilities(identity_status);

-- Enable RLS
ALTER TABLE pet_facilities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow public/authenticated users to view all facilities (for listings)
CREATE POLICY "pet_facilities_select_all"
  ON pet_facilities
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to insert their own facilities
CREATE POLICY "pet_facilities_owner_insert"
  ON pet_facilities
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Allow owners to update their own facilities
CREATE POLICY "pet_facilities_owner_update"
  ON pet_facilities
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Allow owners to delete their own facilities
CREATE POLICY "pet_facilities_owner_delete"
  ON pet_facilities
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Allow admins to do everything (including delete)
CREATE POLICY "pet_facilities_admin_all"
  ON pet_facilities
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type IN ('admin', 'superadmin')
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON pet_facilities TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Insert some sample data for testing
INSERT INTO pet_facilities (
  owner_id,
  name,
  category_id,
  address,
  phone,
  website,
  description,
  status,
  created_at
) VALUES
-- Sample pending application
(
  (SELECT id FROM auth.users LIMIT 1),
  'テストホテル',
  'pet_hotel',
  '東京都千代田区丸の内1-1-1',
  '03-1234-5678',
  'https://test-hotel.example.com',
  'ペットホテルのテスト申請です。24時間体制でペットのお世話をいたします。',
  'pending',
  now()
),
-- Sample approved facility
(
  (SELECT id FROM auth.users LIMIT 1),
  'ペットサロン花',
  'pet_salon',
  '東京都渋谷区渋谷2-2-2',
  '03-9876-5432',
  'https://salon-hana.example.com',
  '愛犬の美容とリラクゼーションを提供するペットサロンです。',
  'approved',
  now() - interval '1 day'
) ON CONFLICT DO NOTHING;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_pet_facilities_updated_at ON pet_facilities;
CREATE TRIGGER update_pet_facilities_updated_at
    BEFORE UPDATE ON pet_facilities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Pet facilities table created successfully' as message; 