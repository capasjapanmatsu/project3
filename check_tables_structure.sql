-- テーブル構造確認SQL

-- 1. facility_couponsテーブルが存在するかチェック
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'facility_coupons'
);

-- 2. facility_couponsテーブルの構造を確認
\d facility_coupons;

-- 3. user_couponsテーブルが存在するかチェック
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_coupons'
);

-- 4. user_couponsテーブルの構造を確認
\d user_coupons;

-- 5. 全てのテーブル一覧を確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%coupon%'
ORDER BY table_name; 