CREATE TABLE IF NOT EXISTS pet_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(20),
  website VARCHAR(255),
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES auth.users(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facility_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES pet_facilities(id) ON DELETE CASCADE,
  image_data TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- テーブルのRLS設定
ALTER TABLE pet_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_images ENABLE ROW LEVEL SECURITY;

-- 基本的なRLSポリシー
CREATE POLICY IF NOT EXISTS \
Users
can
view
their
own
facilities\ ON pet_facilities
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY IF NOT EXISTS \Users
can
insert
their
own
facilities\ ON pet_facilities
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY IF NOT EXISTS \Approved
facilities
are
visible
to
all\ ON pet_facilities
  FOR SELECT USING (status = 'approved');

CREATE POLICY IF NOT EXISTS \Users
can
view
their
own
facility
images\ ON facility_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pet_facilities 
      WHERE pet_facilities.id = facility_images.facility_id 
      AND pet_facilities.owner_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS \Users
can
insert
their
own
facility
images\ ON facility_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM pet_facilities 
      WHERE pet_facilities.id = facility_images.facility_id 
      AND pet_facilities.owner_id = auth.uid()
    )
  );
