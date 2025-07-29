-- ワクチン証明書テーブルとFAB機能のためのSQL

-- ワクチン証明書テーブルを作成
CREATE TABLE IF NOT EXISTS vaccine_certificates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
    certificate_url TEXT NOT NULL,
    vaccine_type VARCHAR(100) NOT NULL,
    vaccination_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    veterinary_clinic VARCHAR(255),
    batch_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_vaccine_certificates_dog_id ON vaccine_certificates(dog_id);
CREATE INDEX IF NOT EXISTS idx_vaccine_certificates_status ON vaccine_certificates(status);
CREATE INDEX IF NOT EXISTS idx_vaccine_certificates_expiry_date ON vaccine_certificates(expiry_date);
CREATE INDEX IF NOT EXISTS idx_vaccine_certificates_vaccination_date ON vaccine_certificates(vaccination_date);

-- RLSポリシーを設定
ALTER TABLE vaccine_certificates ENABLE ROW LEVEL SECURITY;

-- 全てのユーザーが承認済み証明書を閲覧可能
CREATE POLICY "Anyone can view approved vaccine certificates" ON vaccine_certificates
    FOR SELECT USING (status = 'approved');

-- 犬の飼い主が自分の犬の証明書を管理可能
CREATE POLICY "Dog owners can manage own certificates" ON vaccine_certificates
    FOR ALL USING (
        dog_id IN (
            SELECT id FROM dogs WHERE owner_id = auth.uid()
        )
    );

-- 管理者が全ての証明書を管理可能
CREATE POLICY "Admins can manage all certificates" ON vaccine_certificates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- コメント追加
COMMENT ON TABLE vaccine_certificates IS 'ワンちゃんのワクチン接種証明書';
COMMENT ON COLUMN vaccine_certificates.dog_id IS '犬のID';
COMMENT ON COLUMN vaccine_certificates.certificate_url IS '証明書画像のURL';
COMMENT ON COLUMN vaccine_certificates.vaccine_type IS 'ワクチンの種類（狂犬病、混合ワクチンなど）';
COMMENT ON COLUMN vaccine_certificates.vaccination_date IS 'ワクチン接種日';
COMMENT ON COLUMN vaccine_certificates.expiry_date IS 'ワクチン有効期限';
COMMENT ON COLUMN vaccine_certificates.status IS '承認状況（pending, approved, rejected）';
COMMENT ON COLUMN vaccine_certificates.veterinary_clinic IS '接種した動物病院名';
COMMENT ON COLUMN vaccine_certificates.batch_number IS 'ワクチンのバッチ番号';

-- サンプルデータの挿入（テスト用）
-- 注意: 実際のdog_idに置き換えてください
/*
INSERT INTO vaccine_certificates (
    dog_id, 
    certificate_url, 
    vaccine_type, 
    vaccination_date, 
    expiry_date, 
    status,
    veterinary_clinic
) VALUES (
    (SELECT id FROM dogs LIMIT 1), -- 最初の犬のIDを使用
    'https://example.com/certificate.jpg',
    '狂犬病ワクチン',
    '2024-01-15',
    '2025-01-15',
    'approved',
    'ドッグパーク動物病院'
);
*/

-- 証明書の有効期限チェック用のビューを作成
CREATE OR REPLACE VIEW valid_vaccine_certificates AS
SELECT 
    vc.*,
    d.name as dog_name,
    d.breed as dog_breed,
    d.owner_id
FROM vaccine_certificates vc
JOIN dogs d ON vc.dog_id = d.id
WHERE vc.status = 'approved'
  AND vc.expiry_date >= CURRENT_DATE
ORDER BY vc.expiry_date DESC; 