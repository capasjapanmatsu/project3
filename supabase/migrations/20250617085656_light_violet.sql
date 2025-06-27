/*
  # 管理者権限の強化

  1. 管理者権限の追加
    - 管理者がすべての犬情報を管理できるようにするポリシーを追加
    - 管理者がすべてのプロフィールを管理できるようにするポリシーを追加
  
  2. ワクチン証明書の有効期限設定機能の改善
    - 承認時に有効期限を自動設定する機能を強化
*/

-- 管理者がすべての犬情報を管理できるようにするポリシー
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'dogs' 
    AND policyname = 'Admins can manage all dogs'
  ) THEN
    CREATE POLICY "Admins can manage all dogs" 
      ON dogs
      FOR ALL
      TO public
      USING ((auth.jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text)
      WITH CHECK ((auth.jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text);
  END IF;
END
$$;

-- 管理者がすべてのプロフィールを管理できるようにするポリシー
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Admins can manage all profiles'
  ) THEN
    CREATE POLICY "Admins can manage all profiles" 
      ON profiles
      FOR ALL
      TO public
      USING ((auth.jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text)
      WITH CHECK ((auth.jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text);
  END IF;
END
$$;

-- ワクチン証明書承認時に有効期限を設定する関数の改善
CREATE OR REPLACE FUNCTION set_vaccine_expiry_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- ステータスが承認に変更された場合のみ処理
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- 有効期限が設定されていない場合は自動設定
    IF NEW.rabies_expiry_date IS NULL THEN
      -- 狂犬病ワクチンの有効期限を1年後に設定
      NEW.rabies_expiry_date := CURRENT_DATE + INTERVAL '1 year';
    END IF;
    
    IF NEW.combo_expiry_date IS NULL THEN
      -- 混合ワクチンの有効期限を1年後に設定
      NEW.combo_expiry_date := CURRENT_DATE + INTERVAL '1 year';
    END IF;
    
    -- 承認日時を設定
    NEW.approved_at := CURRENT_TIMESTAMP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーが存在しない場合のみ作成
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'vaccine_expiry_on_approval_trigger'
  ) THEN
    CREATE TRIGGER vaccine_expiry_on_approval_trigger
    BEFORE UPDATE ON vaccine_certifications
    FOR EACH ROW
    EXECUTE FUNCTION set_vaccine_expiry_on_approval();
  END IF;
END
$$;