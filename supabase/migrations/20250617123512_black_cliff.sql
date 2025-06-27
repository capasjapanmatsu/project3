-- Stripeウェブフック処理用のテーブル
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processing_error TEXT
);

-- Stripeウェブフック処理用のインデックス
CREATE INDEX IF NOT EXISTS webhook_events_event_type_idx ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS webhook_events_processed_at_idx ON webhook_events(processed_at);

-- Stripe決済ステータスを更新する関数
CREATE OR REPLACE FUNCTION update_payment_status(
  p_order_id UUID,
  p_status TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE orders
  SET payment_status = p_status,
      updated_at = now()
  WHERE id = p_order_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Stripe注文ステータスを更新する関数
CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id UUID,
  p_status TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE orders
  SET status = p_status,
      updated_at = now()
  WHERE id = p_order_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Stripeサブスクリプションステータスを更新する関数
CREATE OR REPLACE FUNCTION update_subscription_status(
  p_subscription_id TEXT,
  p_status TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE stripe_subscriptions
  SET status = p_status,
      updated_at = now()
  WHERE subscription_id = p_subscription_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Stripeサブスクリプションの一時停止/再開を処理する関数
CREATE OR REPLACE FUNCTION handle_subscription_pause()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- ユーザーIDを取得
  SELECT user_id INTO v_user_id
  FROM stripe_customers
  WHERE customer_id = NEW.customer_id
  AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- 一時停止/再開の通知を作成
  IF OLD.status != 'paused' AND NEW.status = 'paused' THEN
    -- 一時停止の通知
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      read
    ) VALUES (
      v_user_id,
      'subscription_paused',
      'サブスクリプションが一時停止されました',
      'サブスクリプションが一時停止されました。現在の期間が終了するまでは引き続きご利用いただけます。',
      jsonb_build_object(
        'subscription_id', NEW.subscription_id,
        'current_period_end', NEW.current_period_end
      ),
      false
    );
  ELSIF OLD.status = 'paused' AND (NEW.status = 'active' OR NEW.status = 'trialing') THEN
    -- 再開の通知
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      read
    ) VALUES (
      v_user_id,
      'subscription_resumed',
      'サブスクリプションが再開されました',
      'サブスクリプションが再開されました。全国のドッグランが使い放題になりました。',
      jsonb_build_object(
        'subscription_id', NEW.subscription_id
      ),
      false
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーが存在しない場合のみ作成
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'subscription_pause_resume_trigger'
  ) THEN
    CREATE TRIGGER subscription_pause_resume_trigger
    AFTER UPDATE ON stripe_subscriptions
    FOR EACH ROW
    WHEN (NEW.status IS DISTINCT FROM OLD.status)
    EXECUTE FUNCTION handle_subscription_pause();
  END IF;
END
$$;