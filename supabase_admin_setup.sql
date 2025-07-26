-- 管理者権限付与とスマートロック設定（Supabaseダッシュボード用）
-- このスクリプトをSupabaseダッシュボードのSQL Editorで実行してください

-- 1. capasjapan@gmail.com にワンデイパス権限を付与
DO $$
DECLARE
  admin_user_id uuid;
  admin_dog_record RECORD;
  park_record RECORD;
  lock_counter integer := 1001;
  processed_parks integer := 0;
  processed_dogs integer := 0;
BEGIN
  -- 管理者ユーザーIDを取得
  SELECT p.id INTO admin_user_id
  FROM profiles p
  WHERE p.email = 'capasjapan@gmail.com' AND p.user_type = 'admin'
  LIMIT 1;
  
  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'capasjapan@gmail.com の管理者アカウントが見つかりません';
    RETURN;
  END IF;
  
  RAISE NOTICE '管理者アカウント確認: %', admin_user_id;
  
  -- 管理者の犬にワンデイパス権限を付与
  FOR admin_dog_record IN
    SELECT d.id, d.name, d.breed
    FROM dogs d
    WHERE d.owner_id = admin_user_id
    ORDER BY d.created_at
    LIMIT 3
  LOOP
    -- 既存の有効なアクセス権をチェック
    IF NOT EXISTS (
      SELECT 1 FROM entrance_qr_codes 
      WHERE user_id = admin_user_id 
      AND dog_id = admin_dog_record.id 
      AND status = 'active' 
      AND valid_until > NOW()
    ) THEN
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
        0,
        NOW() + INTERVAL '24 hours',
        'active',
        NULL,
        NOW()
      );
      
      processed_dogs := processed_dogs + 1;
      RAISE NOTICE '犬「%」にワンデイパス権限を付与', admin_dog_record.name;
    ELSE
      RAISE NOTICE '犬「%」は既にアクティブな権限を持っています', admin_dog_record.name;
    END IF;
  END LOOP;
  
  -- 公開中ドッグランにスマートロック設定
  FOR park_record IN
    SELECT dp.id, dp.name, dp.address, dp.prefecture
    FROM dog_parks dp
    WHERE dp.status = 'approved' AND (dp.is_public = true OR dp.is_public IS NULL)
    ORDER BY dp.created_at
  LOOP
    IF NOT EXISTS (SELECT 1 FROM smart_locks WHERE park_id = park_record.id) THEN
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
        lock_counter::text,
        park_record.name || ' - 入場ゲート',
        'ttlock_smart_lock',
        85,
        true,
        'entry_exit',
        NOW(),
        NOW()
      );
      
      lock_counter := lock_counter + 1;
      processed_parks := processed_parks + 1;
      RAISE NOTICE 'ドッグラン「%」にスマートロック設定完了', park_record.name;
    ELSE
      RAISE NOTICE 'ドッグラン「%」は既にスマートロック設定済み', park_record.name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '=== 設定完了 ===';
  RAISE NOTICE 'ワンデイパス付与: % 頭', processed_dogs;
  RAISE NOTICE 'スマートロック設定: % 施設', processed_parks;
  RAISE NOTICE '有効期限: %', (NOW() + INTERVAL '24 hours')::timestamp;
  
END;
$$; 