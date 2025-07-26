-- データベース制約とスキーマ修正スクリプト
-- Supabaseダッシュボードで実行してください

-- 1. entrance_qr_codesのpayment_type制約を修正
DO $$
BEGIN
  -- 既存の制約を削除
  ALTER TABLE entrance_qr_codes DROP CONSTRAINT IF EXISTS entrance_qr_codes_payment_type_check;
  
  -- 新しい制約を追加（admin_grantを含む）
  ALTER TABLE entrance_qr_codes ADD CONSTRAINT entrance_qr_codes_payment_type_check 
    CHECK (payment_type IN ('single', 'subscription', 'admin_grant'));
  
  RAISE NOTICE '✓ entrance_qr_codes制約を更新しました';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠ entrance_qr_codes制約更新でエラー: %', SQLERRM;
END;
$$;

-- 2. dogsテーブルにageカラムがない場合は追加（存在チェック付き）
DO $$
BEGIN
  -- ageカラムが存在しない場合のみ追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dogs' AND column_name = 'age'
  ) THEN
    ALTER TABLE dogs ADD COLUMN age integer;
    RAISE NOTICE '✓ dogsテーブルにageカラムを追加しました';
  ELSE
    RAISE NOTICE '→ dogsテーブルのageカラムは既に存在します';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠ dogsテーブルageカラム追加でエラー: %', SQLERRM;
END;
$$;

-- 3. smart_locksテーブルの制約確認・修正
DO $$
BEGIN
  -- is_onlineカラムが存在しない場合は追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'smart_locks' AND column_name = 'is_online'
  ) THEN
    ALTER TABLE smart_locks ADD COLUMN is_online boolean DEFAULT true;
    RAISE NOTICE '✓ smart_locksテーブルにis_onlineカラムを追加しました';
  END IF;

  -- battery_levelカラムが存在しない場合は追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'smart_locks' AND column_name = 'battery_level'
  ) THEN
    ALTER TABLE smart_locks ADD COLUMN battery_level integer DEFAULT 100;
    RAISE NOTICE '✓ smart_locksテーブルにbattery_levelカラムを追加しました';
  END IF;

  -- purposeカラムが存在しない場合は追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'smart_locks' AND column_name = 'purpose'
  ) THEN
    ALTER TABLE smart_locks ADD COLUMN purpose text DEFAULT 'entry_exit';
    RAISE NOTICE '✓ smart_locksテーブルにpurposeカラムを追加しました';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠ smart_locksテーブル修正でエラー: %', SQLERRM;
END;
$$;

-- 4. RLSポリシーの確認と修正
DO $$
BEGIN
  -- entrance_qr_codesテーブルのRLSポリシーを確認
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'entrance_qr_codes' AND policyname = 'Users can manage their own QR codes'
  ) THEN
    CREATE POLICY "Users can manage their own QR codes" ON entrance_qr_codes
      FOR ALL USING (auth.uid() = user_id);
    RAISE NOTICE '✓ entrance_qr_codesのRLSポリシーを作成しました';
  END IF;

  -- smart_locksテーブルのRLSポリシーを確認
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'smart_locks' AND policyname = 'Anyone can view smart locks'
  ) THEN
    CREATE POLICY "Anyone can view smart locks" ON smart_locks
      FOR SELECT USING (true);
    RAISE NOTICE '✓ smart_locksのRLSポリシーを作成しました';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠ RLSポリシー作成でエラー: %', SQLERRM;
END;
$$;

-- 5. 修正後の動作確認
SELECT 
  'テーブル構造確認' as check_type,
  t.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_name IN ('entrance_qr_codes', 'dogs', 'smart_locks', 'dog_parks')
AND t.table_schema = 'public'
ORDER BY t.table_name, c.ordinal_position; 