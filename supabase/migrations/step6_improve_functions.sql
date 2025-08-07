-- ============================================
-- 複数人同時利用のための関数
-- ============================================

-- 1. 友達候補を取得する関数
CREATE OR REPLACE FUNCTION get_friend_candidates(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
  candidate_user_id UUID,
  shared_sessions_count INTEGER,
  last_met_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN sal.user1_id = p_user_id THEN sal.user2_id
      ELSE sal.user1_id
    END as candidate_user_id,
    COUNT(*)::INTEGER as shared_sessions_count,
    MAX(sal.overlap_start) as last_met_at
  FROM shared_access_logs sal
  WHERE (sal.user1_id = p_user_id OR sal.user2_id = p_user_id)
    AND NOT EXISTS (
      SELECT 1 FROM friendships f
      WHERE (f.user1_id = p_user_id AND f.user2_id = CASE 
          WHEN sal.user1_id = p_user_id THEN sal.user2_id
          ELSE sal.user1_id
        END)
        OR (f.user2_id = p_user_id AND f.user1_id = CASE 
          WHEN sal.user1_id = p_user_id THEN sal.user2_id
          ELSE sal.user1_id
        END)
    )
  GROUP BY candidate_user_id
  ORDER BY shared_sessions_count DESC, last_met_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 同じ時間帯にいたユーザーを取得する関数
CREATE OR REPLACE FUNCTION get_concurrent_users(
  p_dog_run_id UUID,
  p_timestamp TIMESTAMP WITH TIME ZONE,
  p_time_window_minutes INTEGER DEFAULT 15
) RETURNS TABLE (
  user_id UUID,
  dog_id UUID,
  dog_name TEXT,
  user_nickname TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    al.user_id,
    al.dog_id,
    d.name as dog_name,
    p.nickname as user_nickname,
    al.status
  FROM access_logs al
  LEFT JOIN dogs d ON d.id = al.dog_id
  LEFT JOIN profiles p ON p.id = al.user_id
  WHERE al.dog_run_id = p_dog_run_id
    AND al.status IN ('entered', 'exit_requested')
    AND al.used_at BETWEEN (p_timestamp - (p_time_window_minutes || ' minutes')::INTERVAL) 
                       AND (p_timestamp + (p_time_window_minutes || ' minutes')::INTERVAL)
  ORDER BY al.used_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 最適化された入場処理関数
CREATE OR REPLACE FUNCTION process_entry_log_optimized(
  p_user_id UUID,
  p_dog_id UUID,
  p_dog_run_id UUID,
  p_used_at TIMESTAMP WITH TIME ZONE
) RETURNS VOID AS $$
DECLARE
  v_concurrent_count INTEGER;
  v_session_id UUID;
  v_time_slot INTEGER;
BEGIN
  -- dog_park_stats の更新
  INSERT INTO dog_park_stats (dog_id, dog_run_id, visit_count, last_visit_at)
  VALUES (p_dog_id, p_dog_run_id, 1, p_used_at)
  ON CONFLICT (dog_id, dog_run_id) 
  DO UPDATE SET
    visit_count = dog_park_stats.visit_count + 1,
    last_visit_at = p_used_at,
    updated_at = now();

  -- 同時利用者数をカウント
  SELECT COUNT(DISTINCT user_id) INTO v_concurrent_count
  FROM access_logs
  WHERE dog_run_id = p_dog_run_id
    AND user_id != p_user_id
    AND status IN ('entered', 'exit_requested')
    AND used_at BETWEEN (p_used_at - INTERVAL '15 minutes') 
                    AND (p_used_at + INTERVAL '15 minutes');

  -- 人数に応じた処理
  IF v_concurrent_count < 10 THEN
    -- 少人数の場合は個別にペアを記録
    INSERT INTO shared_access_logs (
      user1_id, user2_id, 
      dog1_id, dog2_id,
      dog_run_id, overlap_start
    )
    SELECT DISTINCT
      LEAST(p_user_id, al.user_id),
      GREATEST(p_user_id, al.user_id),
      CASE 
        WHEN p_user_id < al.user_id THEN p_dog_id 
        ELSE al.dog_id 
      END,
      CASE 
        WHEN p_user_id < al.user_id THEN al.dog_id 
        ELSE p_dog_id 
      END,
      p_dog_run_id,
      p_used_at
    FROM access_logs al
    WHERE al.dog_run_id = p_dog_run_id
      AND al.user_id != p_user_id
      AND al.status IN ('entered', 'exit_requested')
      AND al.used_at BETWEEN (p_used_at - INTERVAL '15 minutes') 
                          AND (p_used_at + INTERVAL '15 minutes')
    ON CONFLICT DO NOTHING;
  ELSE
    -- 大人数の場合はセッション方式で記録
    v_time_slot := EXTRACT(HOUR FROM p_used_at) * 4 + FLOOR(EXTRACT(MINUTE FROM p_used_at) / 15)::INTEGER;
    
    -- セッションを作成または取得
    INSERT INTO dog_run_sessions (dog_run_id, session_date, time_slot, user_count)
    VALUES (p_dog_run_id, DATE(p_used_at), v_time_slot, 1)
    ON CONFLICT (dog_run_id, session_date, time_slot)
    DO UPDATE SET user_count = dog_run_sessions.user_count + 1
    RETURNING id INTO v_session_id;
    
    -- セッション参加者として記録
    INSERT INTO session_participants (session_id, user_id, dog_id, joined_at)
    VALUES (v_session_id, p_user_id, p_dog_id, p_used_at);
  END IF;

  -- ブラックリスト通知処理
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
