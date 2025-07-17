-- pet_facilitiesテーブルに本人確認書類の列を追加

-- 本人確認書類のURL
ALTER TABLE pet_facilities 
ADD COLUMN IF NOT EXISTS identity_document_url TEXT;

-- 本人確認書類のファイル名
ALTER TABLE pet_facilities 
ADD COLUMN IF NOT EXISTS identity_document_filename TEXT;

-- 本人確認書類の状態
ALTER TABLE pet_facilities 
ADD COLUMN IF NOT EXISTS identity_status VARCHAR(20) DEFAULT 'not_submitted' 
CHECK (identity_status IN ('not_submitted', 'submitted', 'approved', 'rejected'));

-- 本人確認書類の作成日時
ALTER TABLE pet_facilities 
ADD COLUMN IF NOT EXISTS identity_created_at TIMESTAMP WITH TIME ZONE;

-- コメント追加
COMMENT ON COLUMN pet_facilities.identity_document_url IS 'vaccine-certsバケット内の本人確認書類ファイルパス';
COMMENT ON COLUMN pet_facilities.identity_document_filename IS '本人確認書類の元のファイル名';
COMMENT ON COLUMN pet_facilities.identity_status IS '本人確認書類の審査状況';
COMMENT ON COLUMN pet_facilities.identity_created_at IS '本人確認書類の提出日時';

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_pet_facilities_identity_status ON pet_facilities(identity_status);
CREATE INDEX IF NOT EXISTS idx_pet_facilities_identity_created_at ON pet_facilities(identity_created_at);

-- 既存のデータに対するデフォルト値の設定
UPDATE pet_facilities 
SET identity_status = 'not_submitted' 
WHERE identity_status IS NULL;
