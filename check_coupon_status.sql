-- ユーザーのクーポン取得状況確認クエリ

-- ===========================================
-- Step 1: わんわんカフェのクーポン状況確認
-- ===========================================

-- 1. わんわんカフェの施設IDとクーポン一覧
SELECT 
  pf.id as facility_id,
  pf.name as facility_name,
  fc.id as coupon_id,
  fc.title,
  fc.is_active,
  fc.start_date,
  fc.end_date,
  fc.usage_limit_type,
  fc.created_at
FROM pet_facilities pf
LEFT JOIN facility_coupons fc ON pf.id = fc.facility_id
WHERE pf.name = 'わんわんカフェ'
ORDER BY fc.created_at DESC;

-- ===========================================
-- Step 2: 特定ユーザーの取得履歴確認
-- ===========================================

-- 【使用方法】<YOUR_USER_ID>を実際のユーザーIDに置き換えて実行
-- ユーザーIDの確認方法：ブラウザのDevToolsのConsoleで
-- console.log(user.id) または localStorage.getItem('sb-xxxxx-auth-token')

-- 2. 特定ユーザーのクーポン取得履歴
/*
SELECT 
  uc.id,
  uc.user_id,
  uc.coupon_id,
  uc.obtained_at,
  uc.used_at,
  uc.is_used,
  fc.title as coupon_title,
  pf.name as facility_name
FROM user_coupons uc
JOIN facility_coupons fc ON uc.coupon_id = fc.id
JOIN pet_facilities pf ON fc.facility_id = pf.id
WHERE uc.user_id = '<YOUR_USER_ID>'
  AND pf.name = 'わんわんカフェ'
ORDER BY uc.obtained_at DESC;
*/

-- ===========================================
-- Step 3: 全体の取得状況確認
-- ===========================================

-- 3. わんわんカフェのクーポン取得状況（全ユーザー）
SELECT 
  fc.title,
  fc.usage_limit_type,
  fc.is_active,
  COUNT(uc.id) as total_obtained,
  COUNT(CASE WHEN uc.is_used = true THEN 1 END) as total_used
FROM facility_coupons fc
JOIN pet_facilities pf ON fc.facility_id = pf.id
LEFT JOIN user_coupons uc ON fc.id = uc.coupon_id
WHERE pf.name = 'わんわんカフェ'
GROUP BY fc.id, fc.title, fc.usage_limit_type, fc.is_active
ORDER BY fc.created_at DESC;

-- ===========================================
-- Step 4: 削除用クエリ（必要に応じて）
-- ===========================================

-- 特定ユーザーの特定クーポン取得履歴を削除
-- 【使用方法】<USER_ID>と<COUPON_ID>を実際の値に置き換えて実行
/*
DELETE FROM user_coupons 
WHERE user_id = '<USER_ID>' 
  AND coupon_id = '<COUPON_ID>';
*/

-- 特定クーポンの全取得履歴を削除（テスト時など）
/*
DELETE FROM user_coupons 
WHERE coupon_id IN (
  SELECT fc.id 
  FROM facility_coupons fc
  JOIN pet_facilities pf ON fc.facility_id = pf.id
  WHERE pf.name = 'わんわんカフェ'
);
*/ 