-- スポンサー広告お問い合わせテーブルを作成
CREATE TABLE IF NOT EXISTS sponsor_inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'completed', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  access_token TEXT,
  sponsor_url TEXT
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_sponsor_inquiries_email ON sponsor_inquiries(email);
CREATE INDEX IF NOT EXISTS idx_sponsor_inquiries_status ON sponsor_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_sponsor_inquiries_created_at ON sponsor_inquiries(created_at);

-- RLSポリシーを有効化
ALTER TABLE sponsor_inquiries ENABLE ROW LEVEL SECURITY;

-- 管理者のみがアクセス可能
CREATE POLICY "Only admins can access sponsor inquiries" ON sponsor_inquiries
  FOR ALL USING (
    (auth.jwt() ->> 'email' = 'capasjapan@gmail.com') OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );

-- 公開挿入を許可（問い合わせフォームから）
CREATE POLICY "Allow public insert for inquiries" ON sponsor_inquiries
  FOR INSERT WITH CHECK (true);

-- テーブルの権限を設定
GRANT ALL ON sponsor_inquiries TO authenticated;
GRANT INSERT ON sponsor_inquiries TO anon;

COMMENT ON TABLE sponsor_inquiries IS 'スポンサー広告お問い合わせテーブル';
COMMENT ON COLUMN sponsor_inquiries.company_name IS '会社名';
COMMENT ON COLUMN sponsor_inquiries.contact_person IS '担当者名';
COMMENT ON COLUMN sponsor_inquiries.email IS 'メールアドレス';
COMMENT ON COLUMN sponsor_inquiries.status IS 'ステータス（pending: 未対応, contacted: 連絡済み, completed: 成約, declined: 辞退）';