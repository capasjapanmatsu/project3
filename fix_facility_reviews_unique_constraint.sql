-- facility_reviewsテーブルの一意制約を削除して、複数レビューを許可する

-- 既存の一意制約を削除（存在する場合）
ALTER TABLE facility_reviews DROP CONSTRAINT IF EXISTS facility_reviews_facility_id_user_id_key;
ALTER TABLE facility_reviews DROP CONSTRAINT IF EXISTS unique_facility_user_review;

-- テーブル構造を確認するためのクエリ
SELECT 
    constraint_name, 
    constraint_type, 
    column_name
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'facility_reviews' 
    AND tc.constraint_type = 'UNIQUE';

-- 現在のテーブル構造を確認
\d facility_reviews;