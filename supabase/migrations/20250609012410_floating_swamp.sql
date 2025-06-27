/*
  # ワクチン有効期限管理システム

  1. テーブル更新
    - `vaccine_certifications`テーブルに有効期限関連カラムを追加
      - `rabies_expiry_date` (date): 狂犬病ワクチン有効期限
      - `combo_expiry_date` (date): 混合ワクチン有効期限
      - `last_checked_at` (timestamp): 最終チェック日時

  2. 自動期限チェック機能
    - 期限切れワクチンを自動的に再承認待ちにする関数
    - 定期実行用の関数

  3. 通知システム
    - 期限切れ前の警告通知
    - 期限切れ時の通知
*/

-- vaccine_certificationsテーブルに有効期限関連カラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vaccine_certifications' AND column_name = 'rabies_expiry_date'
  ) THEN
    ALTER TABLE vaccine_certifications ADD COLUMN rabies_expiry_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vaccine_certifications' AND column_name = 'combo_expiry_date'
  ) THEN
    ALTER TABLE vaccine_certifications ADD COLUMN combo_expiry_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vaccine_certifications' AND column_name = 'last_checked_at'
  ) THEN
    ALTER TABLE vaccine_certifications ADD COLUMN last_checked_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vaccine_certifications' AND column_name = 'expiry_notification_sent'
  ) THEN
    ALTER TABLE vaccine_certifications ADD COLUMN expiry_notification_sent boolean DEFAULT false;
  END IF;
END $$;

-- 通知タイプに期限関連を追加
DO $$
BEGIN
  -- 既存の制約を削除
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notifications_type_check'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
  END IF;
  
  -- 新しい制約を追加（期限関連通知を含む）
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type = ANY (ARRAY[
      'friend_request'::text, 
      'friend_accepted'::text, 
      'friend_at_park'::text, 
      'reservation_reminder'::text, 
      'order_confirmed'::text, 
      'order_shipped'::text, 
      'order_delivered'::text,
      'qr_shared'::text,
      'qr_revoked'::text,
      'vaccine_expiry_warning'::text,
      'vaccine_expired'::text,
      'vaccine_reapproval_required'::text
    ]));
END $$;

-- 期限切れワクチンをチェックして再承認待ちにする関数
CREATE OR REPLACE FUNCTION check_vaccine_expiry()
RETURNS void AS $$
DECLARE
  cert_record RECORD;
  dog_record RECORD;
  owner_record RECORD;
BEGIN
  -- 期限切れまたは期限切れ間近のワクチン証明書をチェック
  FOR cert_record IN
    SELECT 
      vc.*,
      d.name as dog_name,
      d.owner_id,
      p.name as owner_name
    FROM vaccine_certifications vc
    JOIN dogs d ON vc.dog_id = d.id
    JOIN profiles p ON d.owner_id = p.id
    WHERE vc.status = 'approved'
    AND (
      vc.rabies_expiry_date <= CURRENT_DATE + INTERVAL '30 days' OR
      vc.combo_expiry_date <= CURRENT_DATE + INTERVAL '30 days'
    )
  LOOP
    -- 期限切れの場合は再承認待ちに変更
    IF cert_record.rabies_expiry_date <= CURRENT_DATE OR 
       cert_record.combo_expiry_date <= CURRENT_DATE THEN
      
      -- ステータスを再承認待ちに変更
      UPDATE vaccine_certifications 
      SET 
        status = 'pending',
        approved_at = NULL,
        last_checked_at = now(),
        expiry_notification_sent = false
      WHERE id = cert_record.id;
      
      -- 期限切れ通知を送信
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data
      ) VALUES (
        cert_record.owner_id,
        'vaccine_expired',
        'ワクチン接種証明書の有効期限切れ',
        cert_record.dog_name || 'のワクチン接種証明書の有効期限が切れました。新しい証明書をアップロードしてください。',
        jsonb_build_object(
          'dog_id', cert_record.dog_id,
          'dog_name', cert_record.dog_name,
          'certification_id', cert_record.id,
          'rabies_expiry', cert_record.rabies_expiry_date,
          'combo_expiry', cert_record.combo_expiry_date
        )
      );
      
      -- 再承認必要通知も送信
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data
      ) VALUES (
        cert_record.owner_id,
        'vaccine_reapproval_required',
        'ワクチン接種証明書の再承認が必要です',
        cert_record.dog_name || 'のワクチン接種証明書の再承認が必要です。新しい証明書をアップロードして承認を受けてください。',
        jsonb_build_object(
          'dog_id', cert_record.dog_id,
          'dog_name', cert_record.dog_name,
          'certification_id', cert_record.id
        )
      );
      
    -- 期限切れ30日前の警告通知（まだ送信していない場合）
    ELSIF (cert_record.rabies_expiry_date <= CURRENT_DATE + INTERVAL '30 days' OR 
           cert_record.combo_expiry_date <= CURRENT_DATE + INTERVAL '30 days') AND
          NOT cert_record.expiry_notification_sent THEN
      
      -- 警告通知を送信
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data
      ) VALUES (
        cert_record.owner_id,
        'vaccine_expiry_warning',
        'ワクチン接種証明書の有効期限が近づいています',
        cert_record.dog_name || 'のワクチン接種証明書の有効期限が30日以内に切れます。新しい証明書の準備をお願いします。',
        jsonb_build_object(
          'dog_id', cert_record.dog_id,
          'dog_name', cert_record.dog_name,
          'certification_id', cert_record.id,
          'rabies_expiry', cert_record.rabies_expiry_date,
          'combo_expiry', cert_record.combo_expiry_date,
          'days_until_expiry', LEAST(
            cert_record.rabies_expiry_date - CURRENT_DATE,
            cert_record.combo_expiry_date - CURRENT_DATE
          )
        )
      );
      
      -- 通知送信フラグを更新
      UPDATE vaccine_certifications 
      SET 
        expiry_notification_sent = true,
        last_checked_at = now()
      WHERE id = cert_record.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 期限チェックを定期実行するためのヘルパー関数
CREATE OR REPLACE FUNCTION schedule_vaccine_expiry_check()
RETURNS void AS $$
BEGIN
  -- この関数は外部のcronジョブやスケジューラーから呼び出される
  -- 実際の本番環境では、Supabase Edge Functionsやcronジョブで定期実行
  PERFORM check_vaccine_expiry();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 既存の承認済みワクチン証明書にデフォルトの有効期限を設定
-- （狂犬病ワクチン：1年、混合ワクチン：1年）
UPDATE vaccine_certifications 
SET 
  rabies_expiry_date = COALESCE(approved_at::date, created_at::date) + INTERVAL '1 year',
  combo_expiry_date = COALESCE(approved_at::date, created_at::date) + INTERVAL '1 year',
  last_checked_at = now()
WHERE status = 'approved' 
AND (rabies_expiry_date IS NULL OR combo_expiry_date IS NULL);

-- 新しいワクチン証明書承認時に有効期限を自動設定する関数
CREATE OR REPLACE FUNCTION set_vaccine_expiry_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- ステータスがpendingからapprovedに変更された場合
  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    -- 有効期限が設定されていない場合は自動設定
    IF NEW.rabies_expiry_date IS NULL THEN
      NEW.rabies_expiry_date := CURRENT_DATE + INTERVAL '1 year';
    END IF;
    
    IF NEW.combo_expiry_date IS NULL THEN
      NEW.combo_expiry_date := CURRENT_DATE + INTERVAL '1 year';
    END IF;
    
    -- 承認日時を設定
    NEW.approved_at := now();
    NEW.last_checked_at := now();
    NEW.expiry_notification_sent := false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ワクチン証明書承認時の有効期限設定トリガー
DROP TRIGGER IF EXISTS vaccine_expiry_on_approval_trigger ON vaccine_certifications;
CREATE TRIGGER vaccine_expiry_on_approval_trigger
  BEFORE UPDATE ON vaccine_certifications
  FOR EACH ROW
  EXECUTE FUNCTION set_vaccine_expiry_on_approval();

-- 手動で期限チェックを実行（テスト用）
-- SELECT check_vaccine_expiry();