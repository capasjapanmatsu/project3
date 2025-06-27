/*
  # ワクチン証明書承認機能の修正

  1. RLSポリシーの追加
    - 管理者がワクチン証明書を管理できるようにするポリシーを追加
  
  2. 通知機能の強化
    - ワクチン証明書承認/却下時の通知機能を改善
*/

-- 管理者がすべてのワクチン証明書を管理できるようにするポリシー
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vaccine_certifications' 
    AND policyname = 'Admins can manage all vaccine certifications'
  ) THEN
    CREATE POLICY "Admins can manage all vaccine certifications" 
      ON vaccine_certifications
      FOR ALL
      TO public
      USING ((auth.jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text)
      WITH CHECK ((auth.jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text);
  END IF;
END
$$;

-- ワクチン証明書承認通知関数の改善
CREATE OR REPLACE FUNCTION notify_vaccine_approval()
RETURNS TRIGGER AS $$
DECLARE
  dog_name TEXT;
  owner_id UUID;
BEGIN
  -- 犬の名前と飼い主IDを取得
  SELECT dogs.name, dogs.owner_id INTO dog_name, owner_id
  FROM dogs
  WHERE dogs.id = NEW.dog_id;
  
  -- ステータスが変更された場合のみ通知
  IF OLD.status != NEW.status THEN
    -- 通知を作成
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      read
    ) VALUES (
      owner_id,
      CASE 
        WHEN NEW.status = 'approved' THEN 'vaccine_approval_required'
        WHEN NEW.status = 'rejected' THEN 'vaccine_approval_required'
        ELSE 'system_alert'
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN 'ワクチン証明書承認のお知らせ'
        WHEN NEW.status = 'rejected' THEN 'ワクチン証明書却下のお知らせ'
        ELSE 'ワクチン証明書ステータス更新'
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN dog_name || 'ちゃんのワクチン証明書が承認されました。ドッグランを利用できるようになりました。'
        WHEN NEW.status = 'rejected' THEN dog_name || 'ちゃんのワクチン証明書が却下されました。詳細はマイページをご確認ください。'
        ELSE dog_name || 'ちゃんのワクチン証明書のステータスが更新されました。'
      END,
      jsonb_build_object(
        'dog_id', NEW.dog_id,
        'status', NEW.status
      ),
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ワクチン証明書承認通知トリガーの作成（既存のトリガーがある場合は削除してから作成）
DROP TRIGGER IF EXISTS vaccine_approval_notification_trigger ON vaccine_certifications;
CREATE TRIGGER vaccine_approval_notification_trigger
AFTER UPDATE ON vaccine_certifications
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION notify_vaccine_approval();