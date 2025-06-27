-- 本人確認情報を保存するテーブル
CREATE TABLE IF NOT EXISTS owner_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verification_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed')),
  verification_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_user_verification UNIQUE (user_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS owner_verifications_user_id_idx ON owner_verifications(user_id);
CREATE INDEX IF NOT EXISTS owner_verifications_status_idx ON owner_verifications(status);

-- RLSの有効化
ALTER TABLE owner_verifications ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの設定（既存のポリシーがない場合のみ作成）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'owner_verifications' AND policyname = 'Users can manage their own verification data'
  ) THEN
    EXECUTE format('
      CREATE POLICY "Users can manage their own verification data"
      ON owner_verifications
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id)
    ');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'owner_verifications' AND policyname = 'Admins can view all verification data'
  ) THEN
    EXECUTE format('
      CREATE POLICY "Admins can view all verification data"
      ON owner_verifications
      FOR SELECT
      TO authenticated
      USING ((jwt() ->> ''email''::text) = ''capasjapan@gmail.com''::text)
    ');
  END IF;
END
$$;

-- 更新日時を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_owner_verifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成（既存のトリガーがない場合のみ作成）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_owner_verifications_updated_at'
  ) THEN
    CREATE TRIGGER update_owner_verifications_updated_at
    BEFORE UPDATE ON owner_verifications
    FOR EACH ROW
    EXECUTE FUNCTION update_owner_verifications_updated_at();
  END IF;
END
$$;

-- Stripeウェブフックハンドラーの更新
CREATE OR REPLACE FUNCTION handle_stripe_webhook_identity_verification()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_verification_id TEXT;
  v_status TEXT;
BEGIN
  -- イベントタイプが本人確認関連かチェック
  IF NEW.event_type = 'identity.verification_session.verified' OR 
     NEW.event_type = 'identity.verification_session.requires_input' OR
     NEW.event_type = 'identity.verification_session.processing' THEN
    
    -- ユーザーIDと検証IDを取得
    v_verification_id := NEW.data->>'id';
    
    -- 検証IDからユーザーIDを取得
    SELECT user_id INTO v_user_id
    FROM owner_verifications
    WHERE verification_id = v_verification_id;
    
    IF NOT FOUND THEN
      -- 検証IDに対応するユーザーが見つからない場合は処理をスキップ
      RETURN NEW;
    END IF;
    
    -- ステータスを設定
    IF NEW.event_type = 'identity.verification_session.verified' THEN
      v_status := 'verified';
    ELSIF NEW.event_type = 'identity.verification_session.requires_input' THEN
      v_status := 'failed';
    ELSE
      v_status := 'pending';
    END IF;
    
    -- 本人確認情報を更新
    UPDATE owner_verifications
    SET 
      status = v_status,
      verification_data = NEW.data,
      updated_at = now()
    WHERE verification_id = v_verification_id;
    
    -- 本人確認が完了した場合は通知を送信
    IF v_status = 'verified' THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data,
        read
      ) VALUES (
        v_user_id,
        'system_alert',
        '本人確認完了',
        '本人確認が完了しました。ドッグラン登録の次のステップに進むことができます。',
        jsonb_build_object('verification_id', v_verification_id),
        false
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーが存在しない場合のみ作成
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'stripe_webhook_identity_verification_trigger'
  ) THEN
    CREATE TRIGGER stripe_webhook_identity_verification_trigger
    AFTER INSERT ON webhook_events
    FOR EACH ROW
    EXECUTE FUNCTION handle_stripe_webhook_identity_verification();
  END IF;
END
$$;