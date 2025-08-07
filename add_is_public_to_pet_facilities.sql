/*
  # pet_facilitiesテーブルにis_publicカラムを追加
  
  このSQLをSupabaseのSQL Editorで実行してください。
  https://app.supabase.com のプロジェクトダッシュボードから
  SQL Editor を開いて、以下のSQLを実行してください。
*/

-- is_publicカラムを追加
ALTER TABLE pet_facilities 
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- 既存の承認済み施設をデフォルトで公開状態に設定
UPDATE pet_facilities 
SET is_public = true 
WHERE status = 'approved' AND is_public IS NULL;

-- パフォーマンス向上のためのインデックスを作成
CREATE INDEX IF NOT EXISTS idx_pet_facilities_is_public ON pet_facilities(is_public);

-- ドキュメント用のコメントを追加
COMMENT ON COLUMN pet_facilities.is_public IS '施設が一覧に公開表示されるかどうか（承認済み施設のみ適用）';

-- 確認用: カラムが正しく追加されたか確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'pet_facilities' 
AND column_name = 'is_public';
