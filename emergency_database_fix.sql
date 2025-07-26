-- 緊急データベース修正スクリプト
-- 基本的なテーブル構造とカラム不足問題を解決

-- 1. dog_parksテーブルのis_publicカラム追加
DO $$
BEGIN
  -- is_publicカラムが存在しない場合は追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dog_parks' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE dog_parks ADD COLUMN is_public boolean DEFAULT true;
    RAISE NOTICE '✓ dog_parksテーブルにis_publicカラムを追加しました';
    
    -- 既存のレコードを全てtrueに設定
    UPDATE dog_parks SET is_public = true WHERE is_public IS NULL;
    RAISE NOTICE '✓ 既存のdog_parksをpublicに設定しました';
  ELSE
    RAISE NOTICE '→ dog_parks.is_publicカラムは既に存在します';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠ dog_parks.is_public追加でエラー: %', SQLERRM;
END;
$$;

-- 2. dog_parksテーブルに必要な基本カラムを確認・追加
DO $$
BEGIN
  -- latitudeカラム
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dog_parks' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE dog_parks ADD COLUMN latitude double precision;
    RAISE NOTICE '✓ dog_parksテーブルにlatitudeカラムを追加しました';
  END IF;

  -- longitudeカラム
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dog_parks' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE dog_parks ADD COLUMN longitude double precision;
    RAISE NOTICE '✓ dog_parksテーブルにlongitudeカラムを追加しました';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠ dog_parks基本カラム追加でエラー: %', SQLERRM;
END;
$$;

-- 3. entrance_qr_codesテーブルの制約を確実に修正
DO $$
BEGIN
  -- 制約を削除して再作成
  ALTER TABLE entrance_qr_codes DROP CONSTRAINT IF EXISTS entrance_qr_codes_payment_type_check;
  ALTER TABLE entrance_qr_codes ADD CONSTRAINT entrance_qr_codes_payment_type_check 
    CHECK (payment_type IN ('single', 'subscription', 'admin_grant'));
  
  RAISE NOTICE '✓ entrance_qr_codes制約を確実に更新しました';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠ entrance_qr_codes制約更新でエラー: %', SQLERRM;
END;
$$;

-- 4. smart_locksテーブルの完全な構造確認
DO $$
BEGIN
  -- 必要なカラムを一括追加
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'smart_locks' AND column_name = 'lock_id') THEN
    ALTER TABLE smart_locks ADD COLUMN lock_id text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'smart_locks' AND column_name = 'park_id') THEN
    ALTER TABLE smart_locks ADD COLUMN park_id uuid REFERENCES dog_parks(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'smart_locks' AND column_name = 'ttlock_lock_id') THEN
    ALTER TABLE smart_locks ADD COLUMN ttlock_lock_id text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'smart_locks' AND column_name = 'lock_name') THEN
    ALTER TABLE smart_locks ADD COLUMN lock_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'smart_locks' AND column_name = 'lock_type') THEN
    ALTER TABLE smart_locks ADD COLUMN lock_type text DEFAULT 'ttlock_smart_lock';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'smart_locks' AND column_name = 'is_online') THEN
    ALTER TABLE smart_locks ADD COLUMN is_online boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'smart_locks' AND column_name = 'battery_level') THEN
    ALTER TABLE smart_locks ADD COLUMN battery_level integer DEFAULT 100;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'smart_locks' AND column_name = 'purpose') THEN
    ALTER TABLE smart_locks ADD COLUMN purpose text DEFAULT 'entry_exit';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'smart_locks' AND column_name = 'created_at') THEN
    ALTER TABLE smart_locks ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'smart_locks' AND column_name = 'updated_at') THEN
    ALTER TABLE smart_locks ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
  
  RAISE NOTICE '✓ smart_locksテーブル構造を完全に修正しました';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠ smart_locks構造修正でエラー: %', SQLERRM;
END;
$$;

-- 5. 基本的なRLSポリシー設定
DO $$
BEGIN
  -- dog_parksテーブルのRLS
  ALTER TABLE dog_parks ENABLE ROW LEVEL SECURITY;
  
  DROP POLICY IF EXISTS "Anyone can view approved public parks" ON dog_parks;
  CREATE POLICY "Anyone can view approved public parks" ON dog_parks
    FOR SELECT USING (status = 'approved' AND (is_public = true OR is_public IS NULL));
  
  -- smart_locksテーブルのRLS  
  ALTER TABLE smart_locks ENABLE ROW LEVEL SECURITY;
  
  DROP POLICY IF EXISTS "Anyone can view smart locks" ON smart_locks;
  CREATE POLICY "Anyone can view smart locks" ON smart_locks
    FOR SELECT USING (true);
  
  -- entrance_qr_codesテーブルのRLS
  ALTER TABLE entrance_qr_codes ENABLE ROW LEVEL SECURITY;
  
  DROP POLICY IF EXISTS "Users can manage their own QR codes" ON entrance_qr_codes;
  CREATE POLICY "Users can manage their own QR codes" ON entrance_qr_codes
    FOR ALL USING (auth.uid() = user_id);
  
  RAISE NOTICE '✓ 基本的なRLSポリシーを設定しました';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠ RLSポリシー設定でエラー: %', SQLERRM;
END;
$$;

-- 6. テストデータの作成（最低限）
DO $$
DECLARE
  test_park_id uuid;
BEGIN
  -- テスト用ドッグパークが存在しない場合は作成
  SELECT id INTO test_park_id FROM dog_parks WHERE name = 'テスト用ドッグラン' LIMIT 1;
  
  IF test_park_id IS NULL THEN
    INSERT INTO dog_parks (
      name, 
      address, 
      prefecture, 
      city, 
      status, 
      is_public,
      latitude,
      longitude,
      created_at
    ) VALUES (
      'テスト用ドッグラン',
      '東京都渋谷区1-1-1',
      '東京都',
      '渋谷区',
      'approved',
      true,
      35.6580,
      139.7016,
      now()
    ) RETURNING id INTO test_park_id;
    
    RAISE NOTICE '✓ テスト用ドッグランを作成しました: %', test_park_id;
  END IF;
  
  -- テスト用スマートロックが存在しない場合は作成
  IF NOT EXISTS (SELECT 1 FROM smart_locks WHERE park_id = test_park_id) THEN
    INSERT INTO smart_locks (
      lock_id,
      park_id,
      ttlock_lock_id,
      lock_name,
      lock_type,
      is_online,
      battery_level,
      purpose,
      created_at,
      updated_at
    ) VALUES (
      'LOCK_TEST_001',
      test_park_id,
      '1001',
      'テスト用ドッグラン - 入場ゲート',
      'ttlock_smart_lock',
      true,
      85,
      'entry_exit',
      now(),
      now()
    );
    
    RAISE NOTICE '✓ テスト用スマートロックを作成しました';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠ テストデータ作成でエラー: %', SQLERRM;
END;
$$;

-- 7. 修正結果の確認
SELECT 
  'データベース修正結果' as check_type,
  t.table_name,
  COUNT(c.column_name) as column_count,
  array_agg(c.column_name ORDER BY c.ordinal_position) as columns
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND c.table_schema = 'public'
WHERE t.table_name IN ('dog_parks', 'smart_locks', 'entrance_qr_codes', 'dogs')
AND t.table_schema = 'public'
GROUP BY t.table_name
ORDER BY t.table_name; 