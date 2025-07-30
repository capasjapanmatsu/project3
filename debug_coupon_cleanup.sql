-- クーポンデータの状況確認と削除用SQLクエリ

-- ===========================================
-- Step 1: 現在の状況を確認
-- ===========================================

-- 1. facility_couponsの全体状況
SELECT 
  '=== facility_coupons の状況 ===' as info;

SELECT 
  id,
  title,
  facility_id,
  version,
  is_superseded,
  is_active,
  original_id,
  created_at
FROM facility_coupons 
ORDER BY facility_id, original_id, version;

-- 2. 重複/問題のあるクーポンを特定
SELECT 
  '=== 重複の可能性があるクーポン ===' as info;

SELECT 
  original_id,
  COUNT(*) as version_count,
  STRING_AGG(id::text, ', ') as coupon_ids,
  STRING_AGG(version::text, ', ') as versions,
  STRING_AGG(is_superseded::text, ', ') as superseded_status
FROM facility_coupons 
WHERE original_id IS NOT NULL
GROUP BY original_id
HAVING COUNT(*) > 1
ORDER BY version_count DESC;

-- 3. user_couponsの状況
SELECT 
  '=== user_coupons の状況 ===' as info;

SELECT 
  uc.coupon_id,
  fc.title,
  fc.version,
  fc.is_superseded,
  COUNT(*) as user_count
FROM user_coupons uc
JOIN facility_coupons fc ON uc.coupon_id = fc.id
GROUP BY uc.coupon_id, fc.title, fc.version, fc.is_superseded
ORDER BY fc.title, fc.version;

-- ===========================================
-- Step 2: 削除用クエリ（実行前に要確認）
-- ===========================================

-- 【注意】以下のクエリは実行前に必ず内容を確認してください

-- A. 古いバージョン（is_superseded = true）のクーポンを削除
-- 【警告】関連するuser_couponsも削除されます
/*
DELETE FROM user_coupons 
WHERE coupon_id IN (
  SELECT id FROM facility_coupons WHERE is_superseded = true
);

DELETE FROM facility_coupons 
WHERE is_superseded = true;
*/

-- B. 特定のクーポンIDを削除（個別削除用）
-- 【使用方法】<COUPON_ID>を実際のIDに置き換えて実行
/*
-- まずuser_couponsから削除
DELETE FROM user_coupons WHERE coupon_id = '<COUPON_ID>';

-- 次にfacility_couponsから削除
DELETE FROM facility_coupons WHERE id = '<COUPON_ID>';
*/

-- C. 特定ユーザーの特定クーポン取得履歴を削除
-- 【使用方法】<USER_ID>と<COUPON_ID>を実際のIDに置き換えて実行
/*
DELETE FROM user_coupons 
WHERE user_id = '<USER_ID>' AND coupon_id = '<COUPON_ID>';
*/

-- ===========================================
-- Step 3: 削除後の確認
-- ===========================================

-- 削除後にこれらのクエリで確認
/*
-- アクティブなクーポンのみ表示
SELECT 
  id,
  title,
  version,
  is_superseded,
  is_active
FROM facility_coupons 
WHERE is_superseded = false AND is_active = true
ORDER BY title, version;

-- ユーザー取得履歴の確認
SELECT 
  COUNT(*) as total_user_coupons
FROM user_coupons;
*/ 