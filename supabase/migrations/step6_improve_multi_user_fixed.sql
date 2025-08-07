-- ============================================
-- 複数人同時利用への対応改善（修正版）
-- ============================================

-- 1. セッションベースのテーブルを追加
CREATE TABLE IF NOT EXISTS dog_run_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dog_run_id UUID NOT NULL REFERENCES dog_parks(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  time_slot INTEGER NOT NULL,
  user_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(dog_run_id, session_date, time_slot)
);

-- 2. セッション参加者テーブル
CREATE TABLE IF NOT EXISTS session_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES dog_run_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dog_id UUID REFERENCES dogs(id) ON DELETE SET NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL,
  left_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_session_participants_session ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user ON session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_joined ON session_participants(joined_at);

-- RLSポリシー
ALTER TABLE dog_run_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sessions are viewable by all" ON dog_run_sessions;
CREATE POLICY "Sessions are viewable by all" ON dog_run_sessions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view own participation" ON session_participants;
CREATE POLICY "Users can view own participation" ON session_participants
  FOR SELECT USING (auth.uid() = user_id);

-- コメント
COMMENT ON TABLE dog_run_sessions IS 'ドッグラン利用セッション（15分単位）';
COMMENT ON TABLE session_participants IS 'セッション参加者の記録';
COMMENT ON COLUMN dog_run_sessions.time_slot IS '15分単位のタイムスロット（0-95: 00:00-23:45）';
