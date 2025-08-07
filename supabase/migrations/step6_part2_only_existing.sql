-- ============================================
-- ステップ6: パート2 - 確実に存在するテーブルのインデックスのみ
-- ============================================

-- access_logs のインデックス（確認済み）
CREATE INDEX IF NOT EXISTS idx_access_logs_dog_id ON access_logs(dog_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_dog_run_id ON access_logs(dog_run_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_used_at ON access_logs(used_at);

-- dog_park_stats のインデックス（パート1で作成済み）
CREATE INDEX IF NOT EXISTS idx_dog_park_stats_dog_id ON dog_park_stats(dog_id);
CREATE INDEX IF NOT EXISTS idx_dog_park_stats_dog_run_id ON dog_park_stats(dog_run_id);
CREATE INDEX IF NOT EXISTS idx_dog_park_stats_visit_count ON dog_park_stats(visit_count DESC);

-- shared_access_logs のインデックス（パート1で作成済み）
CREATE INDEX IF NOT EXISTS idx_shared_access_logs_user1 ON shared_access_logs(user1_id);
CREATE INDEX IF NOT EXISTS idx_shared_access_logs_user2 ON shared_access_logs(user2_id);
CREATE INDEX IF NOT EXISTS idx_shared_access_logs_dog_run ON shared_access_logs(dog_run_id);
CREATE INDEX IF NOT EXISTS idx_shared_access_logs_overlap ON shared_access_logs(overlap_start DESC);

-- blacklists のインデックス（確認済み）
CREATE INDEX IF NOT EXISTS idx_blacklists_user_id ON blacklists(user_id);
CREATE INDEX IF NOT EXISTS idx_blacklists_blocked_dog ON blacklists(blocked_dog_id);
