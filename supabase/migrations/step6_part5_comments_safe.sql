-- ============================================
-- ステップ6: パート5 - コメント（安全版）
-- ============================================

-- テーブルコメント（作成済みのテーブルのみ）
COMMENT ON TABLE dog_park_stats IS 'ワンちゃんごとのドッグラン利用統計';
COMMENT ON TABLE shared_access_logs IS '同時間帯にドッグランを利用したユーザーの記録';
COMMENT ON TABLE blacklists IS 'ユーザーごとのブラックリスト（要注意犬）';

-- カラムコメント
COMMENT ON COLUMN access_logs.dog_id IS '利用したワンちゃんのID';
COMMENT ON COLUMN access_logs.dog_run_id IS '利用したドッグランのID';
COMMENT ON COLUMN access_logs.duration IS '滞在時間（ミリ秒）';
COMMENT ON COLUMN dog_park_stats.visit_count IS '訪問回数';
COMMENT ON COLUMN dog_park_stats.total_duration IS '総滞在時間（ミリ秒）';
COMMENT ON COLUMN shared_access_logs.overlap_duration IS '重複時間（分）';
