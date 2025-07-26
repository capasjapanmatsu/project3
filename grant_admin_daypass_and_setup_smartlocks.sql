/*
  # 管理者権限付与とスマートロック設定
  
  1. capasjapan@gmail.com にワンデイパス権限付与
    - 現在時刻から24時間有効なアクセス権を付与
    - 最大3頭まで対応
    - payment_type: 'admin_grant' で特別権限として記録
    
  2. 公開中ドッグランにスマートロックID設定
    - status = 'approved' の全ドッグランに対してスマートロック設定
    - テスト用のTTLockデバイスIDを付与
    - 入場・退場用の設定を追加
*/

-- 実行確認用の表示
\echo '=== 管理者権限付与とスマートロック設定を開始 ==='

DO $$
DECLARE
  admin_user_id uuid;
  admin_dog_record RECORD;
  park_record RECORD;
  lock_counter integer := 1001; -- テスト用スマートロックID開始番号
  processed_parks integer := 0;
  processed_dogs integer := 0;
BEGIN
  -- 1. capasjapan@gmail.com のユーザーIDを取得
  SELECT p.id INTO admin_user_id
  FROM profiles p
  WHERE p.email = 'capasjapan@gmail.com' AND p.user_type = 'admin'
  LIMIT 1;
  
  IF admin_user_id IS NULL THEN
    RAISE NOTICE '❌ capasjapan@gmail.com の管理者アカウントが見つかりません';
    RETURN;
  END IF;
  
  RAISE NOTICE '✓ 管理者アカウント確認完了: %', admin_user_id;
  
  -- 2. 管理者の犬情報を取得してワンデイパス権限を付与
  RAISE NOTICE '--- ワンデイパス権限付与開始 ---';
  
  FOR admin_dog_record IN
    SELECT d.id, d.name, d.breed
    FROM dogs d
    WHERE d.owner_id = admin_user_id
    ORDER BY d.created_at
    LIMIT 3  -- 最大3頭まで
  LOOP
    -- 既存のアクティブなentrance_qr_codesをチェック
    PERFORM 1 FROM entrance_qr_codes 
    WHERE user_id = admin_user_id 
    AND dog_id = admin_dog_record.id 
    AND status = 'active' 
    AND valid_until > NOW();
    
    -- 既存のアクティブなアクセス権がない場合のみ作成
    IF NOT FOUND THEN
      INSERT INTO entrance_qr_codes (
        user_id,
        dog_id,
        access_code,
        payment_type,
        amount_charged,
        valid_until,
        status,
        park_id,
        created_at
      ) VALUES (
        admin_user_id,
        admin_dog_record.id,
        'ADMIN_' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)),
        'admin_grant',
        0, -- 管理者は無料
        NOW() + INTERVAL '24 hours', -- 現在時刻から24時間
        'active',
        NULL, -- 全ドッグラン利用可能
        NOW()
      );
      
      processed_dogs := processed_dogs + 1;
      RAISE NOTICE '  ✓ 犬「%」にワンデイパス権限を付与 (ID: %)', admin_dog_record.name, admin_dog_record.id;
    ELSE
      RAISE NOTICE '  → 犬「%」は既にアクティブな権限を持っています', admin_dog_record.name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✓ ワンデイパス権限付与完了: %頭に付与', processed_dogs;
  
  -- 3. 公開中ドッグランにスマートロックID設定
  RAISE NOTICE '--- スマートロック設定開始 ---';
  
  FOR park_record IN
    SELECT dp.id, dp.name, dp.address, dp.prefecture
    FROM dog_parks dp
    WHERE dp.status = 'approved' AND dp.is_public = true
    ORDER BY dp.created_at
  LOOP
    -- 既存のスマートロックをチェック
    PERFORM 1 FROM smart_locks 
    WHERE park_id = park_record.id;
    
    -- スマートロックが未設定の場合のみ作成
    IF NOT FOUND THEN
      INSERT INTO smart_locks (
        lock_id,
        park_id,
        ttlock_lock_id,
        lock_name,
        lock_type,
        battery_level,
        is_online,
        purpose,
        created_at,
        updated_at
      ) VALUES (
        'LOCK_' || lock_counter,
        park_record.id,
        lock_counter::text, -- TTLockデバイスID（テスト用）
        park_record.name || ' - 入場ゲート',
        'ttlock_smart_lock',
        85, -- バッテリー残量85%
        true, -- オンライン状態
        'entry_exit', -- 入退場両用
        NOW(),
        NOW()
      );
      
      lock_counter := lock_counter + 1;
      processed_parks := processed_parks + 1;
      RAISE NOTICE '  ✓ ドッグラン「%」にスマートロック設定 (ID: LOCK_%)', 
        park_record.name, (lock_counter - 1);
    ELSE
      RAISE NOTICE '  → ドッグラン「%」は既にスマートロックが設定済み', park_record.name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✓ スマートロック設定完了: %施設に設定', processed_parks;
  
  -- 4. 結果サマリー表示
  RAISE NOTICE '=== 設定完了サマリー ===';
  RAISE NOTICE '管理者: capasjapan@gmail.com (ID: %)', admin_user_id;
  RAISE NOTICE 'ワンデイパス付与: %頭の犬', processed_dogs;
  RAISE NOTICE 'スマートロック設定: %施設', processed_parks;
  RAISE NOTICE '有効期限: %', (NOW() + INTERVAL '24 hours')::timestamp;
  
END;
$$;

-- 設定結果の確認クエリ
\echo '=== 設定結果確認 ==='

-- 管理者のワンデイパス権限確認
SELECT 
  '管理者ワンデイパス権限' as check_type,
  eqr.access_code,
  d.name as dog_name,
  eqr.payment_type,
  eqr.valid_until,
  eqr.status,
  CASE 
    WHEN eqr.valid_until > NOW() THEN '有効'
    ELSE '期限切れ'
  END as validity_status
FROM entrance_qr_codes eqr
JOIN dogs d ON eqr.dog_id = d.id
JOIN profiles p ON eqr.user_id = p.id
WHERE p.email = 'capasjapan@gmail.com'
AND eqr.payment_type = 'admin_grant'
ORDER BY eqr.created_at DESC;

-- 公開中ドッグランのスマートロック設定確認
SELECT 
  '公開中ドッグランスマートロック' as check_type,
  dp.name as park_name,
  dp.prefecture,
  sl.lock_id,
  sl.ttlock_lock_id,
  sl.lock_name,
  sl.is_online,
  sl.battery_level,
  sl.purpose
FROM dog_parks dp
JOIN smart_locks sl ON dp.id = sl.park_id
WHERE dp.status = 'approved' AND dp.is_public = true
ORDER BY dp.name;

-- 全体サマリー
SELECT 
  'サマリー' as summary_type,
  (SELECT COUNT(*) FROM entrance_qr_codes eqr 
   JOIN profiles p ON eqr.user_id = p.id 
   WHERE p.email = 'capasjapan@gmail.com' 
   AND eqr.payment_type = 'admin_grant' 
   AND eqr.valid_until > NOW()) as active_admin_passes,
  (SELECT COUNT(*) FROM dog_parks WHERE status = 'approved' AND is_public = true) as approved_parks,
  (SELECT COUNT(*) FROM smart_locks sl 
   JOIN dog_parks dp ON sl.park_id = dp.id 
   WHERE dp.status = 'approved' AND dp.is_public = true) as parks_with_smart_locks;

\echo '=== 処理完了 ===' 