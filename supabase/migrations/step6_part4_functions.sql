-- ============================================
-- ステップ6: パート4 - 関数とトリガーの作成
-- ============================================

-- 更新日時を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 入場時の処理を行う関数
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

  -- 2. 同時間帯の他のユーザーを検索して記録
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

  -- 3. 友達通知の生成
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

  -- 4. ブラックリスト通知の生成
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

-- トリガーの作成
DROP TRIGGER IF EXISTS update_dog_park_stats_updated_at ON dog_park_stats;
CREATE TRIGGER update_dog_park_stats_updated_at BEFORE UPDATE ON dog_park_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_friendships_updated_at ON friendships;
CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
