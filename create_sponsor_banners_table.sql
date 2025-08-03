-- スポンサーバナーテーブルの作成
CREATE TABLE IF NOT EXISTS sponsor_banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  website_url TEXT NOT NULL,
  banner_type VARCHAR(20) NOT NULL DEFAULT 'top' CHECK (banner_type IN ('top', 'footer')),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_sponsor_banners_active ON sponsor_banners(is_active);
CREATE INDEX IF NOT EXISTS idx_sponsor_banners_type ON sponsor_banners(banner_type);
CREATE INDEX IF NOT EXISTS idx_sponsor_banners_order ON sponsor_banners(display_order);
CREATE INDEX IF NOT EXISTS idx_sponsor_banners_dates ON sponsor_banners(start_date, end_date);

-- RLSポリシーの設定
ALTER TABLE sponsor_banners ENABLE ROW LEVEL SECURITY;

-- 一般ユーザーは有効なバナーのみ閲覧可能
CREATE POLICY "Anyone can view active banners" ON sponsor_banners
  FOR SELECT USING (is_active = true AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW()));

-- 管理者はすべての操作が可能
CREATE POLICY "Admins can manage all banners" ON sponsor_banners
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- スポンサーバナークリック統計テーブル
CREATE TABLE IF NOT EXISTS sponsor_banner_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  banner_id UUID REFERENCES sponsor_banners(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  ip_address INET
);

-- クリック統計のインデックス
CREATE INDEX IF NOT EXISTS idx_sponsor_clicks_banner ON sponsor_banner_clicks(banner_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_clicks_date ON sponsor_banner_clicks(clicked_at);

-- クリック統計のRLSポリシー
ALTER TABLE sponsor_banner_clicks ENABLE ROW LEVEL SECURITY;

-- 管理者のみクリック統計を閲覧可能
CREATE POLICY "Admins can view click stats" ON sponsor_banner_clicks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 認証済みユーザーはクリックを記録可能
CREATE POLICY "Authenticated users can record clicks" ON sponsor_banner_clicks
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- サンプルデータの挿入
INSERT INTO sponsor_banners (title, description, image_url, website_url, display_order, is_active) VALUES
('ドッグフード専門店 ワンコマート', 'プレミアムドッグフードが最大30%OFF！愛犬の健康を考えた厳選商品をお届け', 'https://via.placeholder.com/800x200/4F46E5/ffffff?text=ワンコマート', 'https://example.com/wanko-mart', 1, true),
('ペットホテル わんわんリゾート', '愛犬も飼い主も安心！24時間スタッフ常駐のペットホテル。初回利用20%OFF', 'https://via.placeholder.com/800x200/059669/ffffff?text=わんわんリゾート', 'https://example.com/wanwan-resort', 2, true),
('ドッグトレーニング教室 パピーアカデミー', 'プロトレーナーによる個別指導！しつけの悩みを解決します。無料体験実施中', 'https://via.placeholder.com/800x200/DC2626/ffffff?text=パピーアカデミー', 'https://example.com/puppy-academy', 3, true),
('ペット用品専門店 ドギーライフ', 'おしゃれなペット用品からケア用品まで！新商品続々入荷中', 'https://via.placeholder.com/800x200/7C3AED/ffffff?text=ドギーライフ', 'https://example.com/doggy-life', 4, true),
('動物病院 ハッピーアニマルクリニック', '愛犬の健康を守る信頼のクリニック。予防接種から緊急診療まで対応', 'https://via.placeholder.com/800x200/EA580C/ffffff?text=ハッピーアニマルクリニック', 'https://example.com/happy-animal', 5, true)
ON CONFLICT (id) DO NOTHING;

-- updated_atトリガーの作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sponsor_banners_updated_at 
    BEFORE UPDATE ON sponsor_banners 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 