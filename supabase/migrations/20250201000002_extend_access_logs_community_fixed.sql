-- ============================================
-- ステップ6: 履歴保存とコミュニティ連携のためのデータ基盤構築（修正版）
-- ============================================

-- 1. access_logsテーブルの拡張
-- --------------------------------------------
-- dogIdとdogRunIdカラムを追加
ALTER TABLE access_logs 
ADD COLUMN IF NOT EXISTS dog_id UUID REFERENCES dogs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS dog_run_id UUID REFERENCES dog_parks(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS duration INTEGER; -- 滞在時間（ミリ秒）

-- インデックスの追加
CREATE INDEX IF NOT EXISTS idx_access_logs_dog_id ON access_logs(dog_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_dog_run_id ON access_logs(dog_run_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_used_at ON access_logs(used_at);

-- 2. dog_park_stats テーブルの作成（入場回数統計）
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS dog_park_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  dog_run_id UUID NOT NULL REFERENCES dog_parks(id) ON DELETE CASCADE,
  visit_count INTEGER DEFAULT 0,
  total_duration BIGINT DEFAULT 0, -- 総滞在時間（ミリ秒）
  last_visit_at TIMESTAMP WITH TIME ZONE,
  first_visit_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- 複合ユニーク制約（dogとdog_runの組み合わせは一意）
  UNIQUE(dog_id, dog_run_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_dog_park_stats_dog_id ON dog_park_stats(dog_id);
CREATE INDEX IF NOT EXISTS idx_dog_park_stats_dog_run_id ON dog_park_stats(dog_run_id);
CREATE INDEX IF NOT EXISTS idx_dog_park_stats_visit_count ON dog_park_stats(visit_count DESC);

-- 3. shared_access_logs テーブルの作成（同時間帯利用者記録）
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
  overlap_duration INTEGER, -- 重複時間（分）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- user1_id < user2_id を保証してペアの重複を防ぐ
  CONSTRAINT shared_access_logs_user_order CHECK (user1_id < user2_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_shared_access_logs_user1 ON shared_access_logs(user1_id);
CREATE INDEX IF NOT EXISTS idx_shared_access_logs_user2 ON shared_access_logs(user2_id);
CREATE INDEX IF NOT EXISTS idx_shared_access_logs_dog_run ON shared_access_logs(dog_run_id);
CREATE INDEX IF NOT EXISTS idx_shared_access_logs_overlap ON shared_access_logs(overlap_start DESC);

-- 4. friendships テーブルの作成（友達関係）
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
  
  -- 複合ユニーク制約
  UNIQUE(user_id, friend_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- 5. blacklists テーブルの作成（ブラックリスト）
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS blacklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- 複合ユニーク制約
  UNIQUE(user_id, blocked_dog_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_blacklists_user_id ON blacklists(user_id);
CREATE INDEX IF NOT EXISTS idx_blacklists_blocked_dog ON blacklists(blocked_dog_id);

-- 6. notifications テーブル（既存の可能性があるので確認）
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

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- RLSポリシーの設定
-- ============================================

-- dog_park_stats のRLSポリシー
ALTER TABLE dog_park_stats ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Users can view own dog stats" ON dog_park_stats;
DROP POLICY IF EXISTS "Service role can manage stats" ON dog_park_stats;

-- 自分の犬の統計は閲覧可能
CREATE POLICY "Users can view own dog stats" ON dog_park_stats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dogs
      WHERE dogs.id = dog_park_stats.dog_id
      AND dogs.owner_id = auth.uid()
    )
  );

-- システムは統計を更新可能
CREATE POLICY "Service role can manage stats" ON dog_park_stats
  FOR ALL
  USING (auth.role() = 'service_role');

-- shared_access_logs のRLSポリシー
ALTER TABLE shared_access_logs ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Users can view own shared logs" ON shared_access_logs;

-- 自分が関わる記録は閲覧可能
CREATE POLICY "Users can view own shared logs" ON shared_access_logs
  FOR SELECT
  USING (
    auth.uid() = user1_id OR 
    auth.uid() = user2_id
  );

-- friendships のRLSポリシー
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Users can view own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
DROP POLICY IF EXISTS "Users can update own friendships" ON friendships;

-- 自分が関わる友達関係は閲覧可能
CREATE POLICY "Users can view own friendships" ON friendships
  FOR SELECT
  USING (
    auth.uid() = user_id OR 
    auth.uid() = friend_id
  );

-- 友達申請は作成可能
CREATE POLICY "Users can create friendships" ON friendships
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 自分が関わる友達関係は更新可能
CREATE POLICY "Users can update own friendships" ON friendships
  FOR UPDATE
  USING (
    auth.uid() = user_id OR 
    auth.uid() = friend_id
  );

-- blacklists のRLSポリシー
ALTER TABLE blacklists ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Users can manage own blacklist" ON blacklists;

-- 自分のブラックリストのみ管理可能
CREATE POLICY "Users can manage own blacklist" ON blacklists
  FOR ALL
  USING (auth.uid() = user_id);

-- notifications のRLSポリシー
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

-- 自分宛の通知のみ閲覧・更新可能
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 関数の作成
-- ============================================

-- 入場時の処理を行う関数
CREATE OR REPLACE FUNCTION process_entry_log(
  p_user_id UUID,
  p_dog_id UUID,
  p_dog_run_id UUID,
  p_used_at TIMESTAMP WITH TIME ZONE
) RETURNS VOID AS $$
DECLARE
  v_friend_id UUID;
  v_blocked_dog_id UUID;
  v_other_user RECORD;
BEGIN
  -- 1. dog_park_stats の更新
  INSERT INTO dog_park_stats (dog_id, dog_run_id, visit_count, last_visit_at)
  VALUES (p_dog_id, p_dog_run_id, 1, p_used_at)
  ON CONFLICT (dog_id, dog_run_id) 
  DO UPDATE SET
    visit_count = dog_park_stats.visit_count + 1,
    last_visit_at = p_used_at,
    updated_at = now();

  -- 2. 同時間帯（±15分）の他のユーザーを検索して記録
  FOR v_other_user IN
    SELECT DISTINCT user_id, dog_id
    FROM access_logs
    WHERE dog_run_id = p_dog_run_id
      AND user_id != p_user_id
      AND status IN ('entered', 'exit_requested')
      AND used_at BETWEEN (p_used_at - INTERVAL '15 minutes') 
                     AND (p_used_at + INTERVAL '15 minutes')
  LOOP
    -- shared_access_logsに記録（user1_id < user2_id を保証）
    INSERT INTO shared_access_logs (
      user1_id, user2_id, 
      dog1_id, dog2_id,
      dog_run_id, overlap_start
    )
    VALUES (
      LEAST(p_user_id, v_other_user.user_id),
      GREATEST(p_user_id, v_other_user.user_id),
      CASE 
        WHEN p_user_id < v_other_user.user_id THEN p_dog_id 
        ELSE v_other_user.dog_id 
      END,
      CASE 
        WHEN p_user_id < v_other_user.user_id THEN v_other_user.dog_id 
        ELSE p_dog_id 
      END,
      p_dog_run_id,
      p_used_at
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- 3. 友達が入場した場合の通知生成
  FOR v_friend_id IN
    SELECT friend_id 
    FROM friendships 
    WHERE user_id = p_user_id 
      AND status = 'accepted'
  LOOP
    -- その友達が現在入場中か確認
    IF EXISTS (
      SELECT 1 FROM access_logs
      WHERE user_id = v_friend_id
        AND dog_run_id = p_dog_run_id
        AND status IN ('entered', 'exit_requested')
        AND used_at >= (p_used_at - INTERVAL '30 minutes')
    ) THEN
      INSERT INTO notifications (
        user_id, type, title, message,
        related_user_id, related_park_id
      )
      VALUES (
        v_friend_id,
        'friend_entered',
        '友達が入場しました',
        'お友達がドッグランに入場しました',
        p_user_id,
        p_dog_run_id
      );
    END IF;
  END LOOP;

  -- 4. ブラックリストの犬が入場した場合の通知生成
  FOR v_blocked_dog_id IN
    SELECT blocked_dog_id 
    FROM blacklists 
    WHERE user_id = p_user_id
  LOOP
    -- その犬が現在入場中か確認
    IF EXISTS (
      SELECT 1 FROM access_logs
      WHERE dog_id = v_blocked_dog_id
        AND dog_run_id = p_dog_run_id
        AND status IN ('entered', 'exit_requested')
        AND used_at >= (p_used_at - INTERVAL '30 minutes')
    ) THEN
      INSERT INTO notifications (
        user_id, type, title, message,
        related_dog_id, related_park_id
      )
      VALUES (
        p_user_id,
        'blacklist_alert',
        '注意が必要な犬が入場しています',
        'ブラックリストに登録した犬が同じドッグランにいます',
        v_blocked_dog_id,
        p_dog_run_id
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 退場時の滞在時間を計算する関数
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

-- 更新日時を自動更新するトリガー（関数が存在しない場合は作成）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 更新日時を自動更新するトリガー（新規テーブル用）
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
COMMENT ON COLUMN dog_park_stats.visit_count IS '訪問回数';
COMMENT ON COLUMN dog_park_stats.total_duration IS '総滞在時間（ミリ秒）';
COMMENT ON COLUMN shared_access_logs.overlap_duration IS '重複時間（分）';
