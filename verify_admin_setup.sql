-- 管理者設定結果の確認クエリ
-- 管理者権限付与とスマートロック設定の結果を確認します

-- 1. 管理者アカウントの基本情報確認
SELECT 
    '管理者アカウント' as check_type,
    p.id,
    p.email,
    p.name,
    p.user_type,
    p.created_at
FROM profiles p
WHERE p.email = 'capasjapan@gmail.com';

-- 2. 管理者の犬情報確認
SELECT 
    '管理者の犬情報' as check_type,
    d.id,
    d.name,
    d.breed,
    d.gender,
    d.created_at
FROM dogs d
JOIN profiles p ON d.owner_id = p.id
WHERE p.email = 'capasjapan@gmail.com'
ORDER BY d.created_at;

-- 3. 管理者のワンデイパス権限確認
SELECT 
    '管理者ワンデイパス権限' as check_type,
    eqr.access_code,
    d.name as dog_name,
    eqr.payment_type,
    eqr.amount_charged,
    eqr.created_at as granted_at,
    eqr.valid_until,
    eqr.status,
    CASE 
        WHEN eqr.valid_until > NOW() THEN '✅ 有効'
        ELSE '❌ 期限切れ'
    END as validity_status,
    EXTRACT(EPOCH FROM (eqr.valid_until - NOW())) / 3600 as hours_remaining
FROM entrance_qr_codes eqr
JOIN dogs d ON eqr.dog_id = d.id
JOIN profiles p ON eqr.user_id = p.id
WHERE p.email = 'capasjapan@gmail.com'
AND eqr.payment_type = 'admin_grant'
ORDER BY eqr.created_at DESC;

-- 4. 公開中ドッグラン一覧確認
SELECT 
    '公開中ドッグラン' as check_type,
    dp.id,
    dp.name,
    dp.prefecture,
    dp.city,
    dp.status,
    dp.is_public,
    dp.created_at
FROM dog_parks dp
WHERE dp.status = 'approved' 
AND (dp.is_public = true OR dp.is_public IS NULL)
ORDER BY dp.created_at;

-- 5. スマートロック設定確認
SELECT 
    'スマートロック設定' as check_type,
    dp.name as park_name,
    dp.prefecture,
    sl.lock_id,
    sl.ttlock_lock_id,
    sl.lock_name,
    sl.lock_type,
    sl.is_online,
    sl.battery_level,
    sl.purpose,
    sl.created_at as lock_setup_at
FROM dog_parks dp
JOIN smart_locks sl ON dp.id = sl.park_id
WHERE dp.status = 'approved' 
AND (dp.is_public = true OR dp.is_public IS NULL)
ORDER BY dp.name;

-- 6. 設定サマリー
SELECT 
    'サマリー' as summary_type,
    (SELECT COUNT(*) FROM profiles WHERE email = 'capasjapan@gmail.com' AND user_type = 'admin') as admin_accounts,
    (SELECT COUNT(*) FROM dogs d JOIN profiles p ON d.owner_id = p.id WHERE p.email = 'capasjapan@gmail.com') as admin_dogs,
    (SELECT COUNT(*) FROM entrance_qr_codes eqr 
     JOIN profiles p ON eqr.user_id = p.id 
     WHERE p.email = 'capasjapan@gmail.com' 
     AND eqr.payment_type = 'admin_grant' 
     AND eqr.valid_until > NOW()) as active_admin_passes,
    (SELECT COUNT(*) FROM dog_parks WHERE status = 'approved' AND (is_public = true OR is_public IS NULL)) as approved_parks,
    (SELECT COUNT(*) FROM smart_locks sl 
     JOIN dog_parks dp ON sl.park_id = dp.id 
     WHERE dp.status = 'approved' AND (dp.is_public = true OR dp.is_public IS NULL)) as parks_with_smart_locks;

-- 7. 入退場テスト用の情報表示
SELECT 
    'PIN発行テスト情報' as test_type,
    dp.name as park_name,
    sl.lock_id,
    sl.ttlock_lock_id,
    'AccessControlページでPIN発行をテストできます' as instruction
FROM dog_parks dp
JOIN smart_locks sl ON dp.id = sl.park_id
WHERE dp.status = 'approved' 
AND (dp.is_public = true OR dp.is_public IS NULL)
LIMIT 3; 