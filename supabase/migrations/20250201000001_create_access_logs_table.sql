-- アクセスログテーブルの作成
-- PINコードの発行と使用履歴を管理
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lock_id TEXT NOT NULL,
  pin TEXT NOT NULL,
  pin_type TEXT NOT NULL CHECK (pin_type IN ('entry', 'exit')),
  status TEXT NOT NULL CHECK (status IN ('issued', 'entered', 'exit_requested', 'exited')),
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  keyboard_pwd_id INTEGER, -- Sciener APIから返されるPIN ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックスの作成
CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_lock_id ON access_logs(lock_id);
CREATE INDEX idx_access_logs_pin ON access_logs(pin);
CREATE INDEX idx_access_logs_status ON access_logs(status);
CREATE INDEX idx_access_logs_issued_at ON access_logs(issued_at DESC);

-- ドッグランロック情報テーブルの作成
CREATE TABLE IF NOT EXISTS dog_run_locks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  lock_id INTEGER NOT NULL UNIQUE, -- ScienerのlockId
  park_id UUID REFERENCES dog_parks(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックスの作成
CREATE INDEX idx_dog_run_locks_lock_id ON dog_run_locks(lock_id);
CREATE INDEX idx_dog_run_locks_park_id ON dog_run_locks(park_id);

-- RLSポリシーの設定
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dog_run_locks ENABLE ROW LEVEL SECURITY;

-- access_logsのRLSポリシー
-- ユーザーは自分のログのみ閲覧可能
CREATE POLICY "Users can view own access logs" ON access_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- ユーザーは自分のログを作成可能
CREATE POLICY "Users can create own access logs" ON access_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- システム（service_role）はすべてのログを更新可能
CREATE POLICY "Service role can update all logs" ON access_logs
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- dog_run_locksのRLSポリシー
-- 認証されたユーザーは閲覧可能
CREATE POLICY "Authenticated users can view locks" ON dog_run_locks
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 管理者のみ作成・更新・削除可能
CREATE POLICY "Admins can manage locks" ON dog_run_locks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_access_logs_updated_at BEFORE UPDATE ON access_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dog_run_locks_updated_at BEFORE UPDATE ON dog_run_locks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- コメントの追加
COMMENT ON TABLE access_logs IS 'PINコードの発行と使用履歴を管理するテーブル';
COMMENT ON TABLE dog_run_locks IS 'ドッグランのスマートロック情報を管理するテーブル';

COMMENT ON COLUMN access_logs.pin_type IS '入場用（entry）または退場用（exit）';
COMMENT ON COLUMN access_logs.status IS 'issued:発行済み, entered:入場済み, exit_requested:退場要求中, exited:退場済み';
COMMENT ON COLUMN access_logs.keyboard_pwd_id IS 'Sciener APIから返されるPIN ID';
COMMENT ON COLUMN dog_run_locks.lock_id IS 'ScienerのスマートロックID';
