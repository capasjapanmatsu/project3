-- ============================================
-- ステップ6: 履歴保存とコミュニティ連携のためのデータ基盤構築（最終修正版）
-- ============================================

-- 1. access_logsテーブルの拡張（既存テーブルに列を追加）
-- --------------------------------------------
ALTER TABLE access_logs 
ADD COLUMN IF NOT EXISTS dog_id UUID REFERENCES dogs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS dog_run_id UUID REFERENCES dog_parks(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS duration INTEGER;

-- インデックスの追加
CREATE INDEX IF NOT EXISTS idx_access_logs_dog_id ON access_logs(dog_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_dog_run_id ON access_logs(dog_run_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_used_at ON access_logs(used_at);

-- 2. dog_park_stats テーブルの作成
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS dog_park_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  dog_run_id UUID NOT NULL REFERENCES dog_parks(id) ON DELETE CASCADE,
  visit_count INTEGER DEFAULT 0,
  total_duration BIGINT DEFAULT 0,
  last_visit_at TIMESTAMP WITH TIME ZONE,
  first_visit_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(dog_id, dog_run_id)
);

CREATE INDEX IF NOT EXISTS idx_dog_park_stats_dog_id ON dog_park_stats(dog_id);
CREATE INDEX IF NOT EXISTS idx_dog_park_stats_dog_run_id ON dog_park_stats(dog_run_id);
CREATE INDEX IF NOT EXISTS idx_dog_park_stats_visit_count ON dog_park_stats(visit_count DESC);

-- 3. shared_access_logs テーブルの作成
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS shared_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dog1_id UUID REFERENCES dogs(id) ON DELETE SET NULL,
  dog2_id UUID REFERENCES dogs(id) ON DELETE SET NULL,
  dog_run_id UUID NOT NULL REFERENCES dog_parks(id) ON DELETE CASCADE,
  overlap_start TIMESTAMP WITH TIME ZONE NOT NULL,
  overlap_end TIMESTAMP WITH TIME ZONE,
  overlap_duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT shared_access_logs_user_order CHECK (user1_id < user2_id)
);

CREATE INDEX IF NOT EXISTS idx_shared_access_logs_user1 ON shared_access_logs(user1_id);
CREATE INDEX IF NOT EXISTS idx_shared_access_logs_user2 ON shared_access_logs(user2_id);
CREATE INDEX IF NOT EXISTS idx_shared_access_logs_dog_run ON shared_access_logs(dog_run_id);
CREATE INDEX IF NOT EXISTS idx_shared_access_logs_overlap ON shared_access_logs(overlap_start DESC);

-- 4. friendships テーブルの作成
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- 5. blacklists テーブルの作成
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS blacklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, blocked_dog_id)
);

CREATE INDEX IF NOT EXISTS idx_blacklists_user_id ON blacklists(user_id);
CREATE INDEX IF NOT EXISTS idx_blacklists_blocked_dog ON blacklists(blocked_dog_id);

-- 6. notifications テーブル
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('friend_entered', 'blacklist_alert', 'system', 'recommendation')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  related_dog_id UUID REFERENCES dogs(id) ON DELETE SET NULL,
  related_park_id UUID REFERENCES dog_parks(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- RLSポリシーの設定
-- ============================================

-- dog_park_stats のRLSポリシー
ALTER TABLE dog_park_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own dog stats" ON dog_park_stats;
DROP POLICY IF EXISTS "Service role can manage stats" ON dog_park_stats;

CREATE POLICY "Users can view own dog stats" ON dog_park_stats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dogs
      WHERE dogs.id = dog_park_stats.dog_id
      AND dogs.owner_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage stats" ON dog_park_stats
  FOR ALL
  USING (auth.role() = 'service_role');

-- shared_access_logs のRLSポリシー
ALTER TABLE shared_access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own shared logs" ON shared_access_logs;

CREATE POLICY "Users can view own shared logs" ON shared_access_logs
  FOR SELECT
  USING (
    auth.uid() = user1_id OR 
    auth.uid() = user2_id
  );

-- friendships のRLSポリシー
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
DROP POLICY IF EXISTS "Users can update own friendships" ON friendships;

CREATE POLICY "Users can view own friendships" ON friendships
  FOR SELECT
  USING (
    auth.uid() = user_id OR 
    auth.uid() = friend_id
  );

CREATE POLICY "Users can create friendships" ON friendships
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own friendships" ON friendships
  FOR UPDATE
  USING (
    auth.uid() = user_id OR 
    auth.uid() = friend_id
  );

-- blacklists のRLSポリシー
ALTER TABLE blacklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own blacklist" ON blacklists;

CREATE POLICY "Users can manage own blacklist" ON blacklists
  FOR ALL
  USING (auth.uid() = user_id);

-- notifications のRLSポリシー
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 関数の作成（シンプル版）
-- ============================================

-- 入場時の処理を行う関数（シンプル版）
CREATE OR REPLACE FUNCTION process_entry_log(
  p_user_id UUID,
  p_dog_id UUID,
  p_dog_run_id UUID,
  p_used_at TIMESTAMP WITH TIME ZONE
) RETURNS VOID AS $$
BEGIN
  -- 1. dog_park_stats の更新
  INSERT INTO dog_park_stats (dog_id, dog_run_id, visit_count, last_visit_at)
  VALUES (p_dog_id, p_dog_run_id, 1, p_used_at)
  ON CONFLICT (dog_id, dog_run_id) 
  DO UPDATE SET
    visit_count = dog_park_stats.visit_count + 1,
    last_visit_at = p_used_at,
    updated_at = now();

  -- 2. 同時間帯の他のユーザーを検索して記録（シンプル版）
  INSERT INTO shared_access_logs (
    user1_id, user2_id, 
    dog1_id, dog2_id,
    dog_run_id, overlap_start
  )
  SELECT DISTINCT
    LEAST(p_user_id, access_logs.user_id),
    GREATEST(p_user_id, access_logs.user_id),
    CASE 
      WHEN p_user_id < access_logs.user_id THEN p_dog_id 
      ELSE access_logs.dog_id 
    END,
    CASE 
      WHEN p_user_id < access_logs.user_id THEN access_logs.dog_id 
      ELSE p_dog_id 
    END,
    p_dog_run_id,
    p_used_at
  FROM access_logs
  WHERE access_logs.dog_run_id = p_dog_run_id
    AND access_logs.user_id != p_user_id
    AND access_logs.status IN ('entered', 'exit_requested')
    AND access_logs.used_at BETWEEN (p_used_at - INTERVAL '15 minutes') 
                                AND (p_used_at + INTERVAL '15 minutes')
  ON CONFLICT DO NOTHING;

  -- 3. 友達通知の生成（シンプル版）
  INSERT INTO notifications (
    user_id, type, title, message,
    related_user_id, related_park_id
  )
  SELECT 
    f.friend_id,
    'friend_entered',
    '友達が入場しました',
    'お友達がドッグランに入場しました',
    p_user_id,
    p_dog_run_id
  FROM friendships f
  WHERE f.user_id = p_user_id 
    AND f.status = 'accepted'
    AND EXISTS (
      SELECT 1 FROM access_logs
      WHERE access_logs.user_id = f.friend_id
        AND access_logs.dog_run_id = p_dog_run_id
        AND access_logs.status IN ('entered', 'exit_requested')
        AND access_logs.used_at >= (p_used_at - INTERVAL '30 minutes')
    );

  -- 4. ブラックリスト通知の生成（シンプル版）
  INSERT INTO notifications (
    user_id, type, title, message,
    related_dog_id, related_park_id
  )
  SELECT 
    p_user_id,
    'blacklist_alert',
    '注意が必要な犬が入場しています',
    'ブラックリストに登録した犬が同じドッグランにいます',
    b.blocked_dog_id,
    p_dog_run_id
  FROM blacklists b
  WHERE b.user_id = p_user_id
    AND EXISTS (
      SELECT 1 FROM access_logs
      WHERE access_logs.dog_id = b.blocked_dog_id
        AND access_logs.dog_run_id = p_dog_run_id
        AND access_logs.status IN ('entered', 'exit_requested')
        AND access_logs.used_at >= (p_used_at - INTERVAL '30 minutes')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 退場時の滞在時間を計算する関数（シンプル版）
CREATE OR REPLACE FUNCTION calculate_duration(
  p_user_id UUID,
  p_dog_run_id UUID,
  p_exit_time TIMESTAMP WITH TIME ZONE
) RETURNS INTEGER AS $$
DECLARE
  v_entry_time TIMESTAMP WITH TIME ZONE;
  v_duration INTEGER;
  v_dog_id UUID;
BEGIN
  -- 最新の入場記録を検索
  SELECT used_at, dog_id INTO v_entry_time, v_dog_id
  FROM access_logs
  WHERE user_id = p_user_id
    AND dog_run_id = p_dog_run_id
    AND pin_type = 'entry'
    AND status = 'entered'
  ORDER BY used_at DESC
  LIMIT 1;

  IF v_entry_time IS NOT NULL THEN
    -- 滞在時間を計算（ミリ秒）
    v_duration := EXTRACT(EPOCH FROM (p_exit_time - v_entry_time)) * 1000;
    
    -- dog_park_statsの総滞在時間を更新
    UPDATE dog_park_stats
    SET total_duration = total_duration + v_duration,
        updated_at = now()
    WHERE dog_id = v_dog_id
      AND dog_run_id = p_dog_run_id;
    
    RETURN v_duration;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 更新日時を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーの作成
DROP TRIGGER IF EXISTS update_dog_park_stats_updated_at ON dog_park_stats;
CREATE TRIGGER update_dog_park_stats_updated_at BEFORE UPDATE ON dog_park_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_friendships_updated_at ON friendships;
CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- コメントの追加
COMMENT ON TABLE dog_park_stats IS 'ワンちゃんごとのドッグラン利用統計';
COMMENT ON TABLE shared_access_logs IS '同時間帯にドッグランを利用したユーザーの記録';
COMMENT ON TABLE friendships IS 'ユーザー間の友達関係';
COMMENT ON TABLE blacklists IS 'ユーザーごとのブラックリスト（要注意犬）';
COMMENT ON COLUMN access_logs.dog_id IS '利用したワンちゃんのID';
COMMENT ON COLUMN access_logs.dog_run_id IS '利用したドッグランのID';
COMMENT ON COLUMN access_logs.duration IS '滞在時間（ミリ秒）';
