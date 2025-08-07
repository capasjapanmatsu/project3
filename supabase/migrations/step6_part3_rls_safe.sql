-- ============================================
-- ステップ6: パート3 - RLSポリシー（安全版）
-- ============================================

-- dog_park_stats のRLSポリシー
ALTER TABLE dog_park_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own dog stats" ON dog_park_stats;
CREATE POLICY "Users can view own dog stats" ON dog_park_stats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dogs
      WHERE dogs.id = dog_park_stats.dog_id
      AND dogs.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can manage stats" ON dog_park_stats;
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

-- blacklists のRLSポリシー
ALTER TABLE blacklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own blacklist" ON blacklists;
CREATE POLICY "Users can manage own blacklist" ON blacklists
  FOR ALL
  USING (auth.uid() = user_id);

-- notifications のRLSポリシー
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);
