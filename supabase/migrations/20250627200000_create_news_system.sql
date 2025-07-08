/*
  # Create News System Tables

  1. Tables to create
    - `news_announcements` - News and announcements
    - `new_park_openings` - New park opening information
  
  2. Security
    - Enable RLS on both tables
    - Add appropriate policies for admin and public access
  
  3. Indexes
    - Add indexes for better performance
*/

-- Create news_announcements table
CREATE TABLE IF NOT EXISTS news_announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'news' CHECK (category IN ('news', 'announcement', 'sale')),
  is_important BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  image_url TEXT,
  link_url TEXT,
  park_id UUID REFERENCES dog_parks(id) ON DELETE SET NULL
);

-- Create new_park_openings table
CREATE TABLE IF NOT EXISTS new_park_openings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  image_url TEXT,
  opening_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  park_id UUID REFERENCES dog_parks(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE news_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE new_park_openings ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_news_announcements_created_at ON news_announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_announcements_category ON news_announcements(category);
CREATE INDEX IF NOT EXISTS idx_news_announcements_is_important ON news_announcements(is_important);

CREATE INDEX IF NOT EXISTS idx_new_park_openings_created_at ON new_park_openings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_new_park_openings_opening_date ON new_park_openings(opening_date DESC);

-- RLS Policies for news_announcements
-- Anyone can read news announcements
CREATE POLICY "Public can view news announcements"
  ON news_announcements FOR SELECT
  TO public
  USING (true);

-- Only admins can create, update, delete news announcements
CREATE POLICY "Admins can manage news announcements"
  ON news_announcements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'admin'
    )
  );

-- RLS Policies for new_park_openings
-- Anyone can read new park openings
CREATE POLICY "Public can view new park openings"
  ON new_park_openings FOR SELECT
  TO public
  USING (true);

-- Only admins can create, update, delete new park openings
CREATE POLICY "Admins can manage new park openings"
  ON new_park_openings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'admin'
    )
  );

-- Add update timestamp trigger for news_announcements
CREATE OR REPLACE FUNCTION update_news_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_news_announcements_updated_at
  BEFORE UPDATE ON news_announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_news_announcements_updated_at();

-- Add update timestamp trigger for new_park_openings
CREATE OR REPLACE FUNCTION update_new_park_openings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_new_park_openings_updated_at
  BEFORE UPDATE ON new_park_openings
  FOR EACH ROW
  EXECUTE FUNCTION update_new_park_openings_updated_at();

-- Insert sample news data
INSERT INTO news_announcements (title, content, category, is_important, image_url) VALUES
  ('ドッグランアプリがリニューアルしました！', 'より使いやすくなったドッグランアプリをぜひお試しください。新機能として、ワンちゃん同士の出会い記録機能や友達申請機能が追加されました。', 'announcement', true, 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg'),
  ('年末年始営業時間のお知らせ', '12月29日から1月3日まで、各ドッグランの営業時間が変更となります。詳細は各施設ページをご確認ください。', 'news', false, null),
  ('新春キャンペーン開催中！', '1月31日まで、初回利用者限定で利用料金が50%オフ！この機会にぜひドッグランをご利用ください。', 'sale', true, 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg');

-- Insert sample new park openings data
INSERT INTO new_park_openings (name, address, opening_date, image_url) VALUES
  ('青山ドッグパーク', '東京都港区青山1-1-1', '2025-02-15', 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg'),
  ('湘南海岸ドッグラン', '神奈川県藤沢市片瀬海岸2-2-2', '2025-03-01', 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg');

COMMENT ON TABLE news_announcements IS 'News and announcements for the dog park app';
COMMENT ON TABLE new_park_openings IS 'Information about new dog park openings'; 