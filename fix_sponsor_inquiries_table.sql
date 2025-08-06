-- sponsor_inquiries テーブルを修正版で作成
DROP TABLE IF EXISTS sponsor_inquiries CASCADE;

CREATE TABLE sponsor_inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'completed', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
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

-- テーブルの権限を設定
GRANT ALL ON sponsor_inquiries TO authenticated;

COMMENT ON TABLE sponsor_inquiries IS 'スポンサー広告お問い合わせテーブル';
COMMENT ON COLUMN sponsor_inquiries.company_name IS '会社名';
COMMENT ON COLUMN sponsor_inquiries.contact_person IS '担当者名';
COMMENT ON COLUMN sponsor_inquiries.email IS 'メールアドレス';
COMMENT ON COLUMN sponsor_inquiries.status IS 'ステータス（pending: 未対応, contacted: 連絡済み, completed: 成約, declined: 辞退）';
COMMENT ON COLUMN sponsor_inquiries.access_token IS 'アクセストークン';
COMMENT ON COLUMN sponsor_inquiries.sponsor_url IS 'スポンサー申し込みURL';