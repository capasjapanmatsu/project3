-- ============================================
-- dog_run_locksテーブルの機能拡張
-- スマートロック管理に必要な追加カラム
-- ============================================

-- lock_idの型をTEXTに変更（より柔軟な対応のため）
ALTER TABLE dog_run_locks 
ALTER COLUMN lock_id TYPE TEXT USING lock_id::TEXT;

-- 追加カラムの作成
ALTER TABLE dog_run_locks
ADD COLUMN IF NOT EXISTS lock_type TEXT DEFAULT 'WiFi' CHECK (lock_type IN ('BLE', 'WiFi', 'NB-IoT', 'Other')),
ADD COLUMN IF NOT EXISTS installation_notes TEXT,
ADD COLUMN IF NOT EXISTS timezone_offset INTEGER DEFAULT 9, -- 日本標準時（UTC+9）
ADD COLUMN IF NOT EXISTS api_credentials JSONB, -- API認証情報（暗号化推奨）
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS battery_level INTEGER, -- バッテリー残量（%）
ADD COLUMN IF NOT EXISTS firmware_version TEXT;

-- インデックスの追加
CREATE INDEX IF NOT EXISTS idx_dog_run_locks_lock_type ON dog_run_locks(lock_type);
CREATE INDEX IF NOT EXISTS idx_dog_run_locks_last_sync ON dog_run_locks(last_sync_at);

-- access_logsテーブルにkeyboard_pwd_versionカラムを追加（PIN管理改善）
ALTER TABLE access_logs
ADD COLUMN IF NOT EXISTS keyboard_pwd_version INTEGER DEFAULT 1, -- PINバージョン管理
ADD COLUMN IF NOT EXISTS lock_name TEXT; -- ロック名（複数ロック対応）

-- コメントの追加
COMMENT ON COLUMN dog_run_locks.lock_type IS 'スマートロックの接続タイプ（BLE, WiFi, NB-IoT等）';
COMMENT ON COLUMN dog_run_locks.installation_notes IS '設置場所の詳細メモ（例：南側ゲート上部）';
COMMENT ON COLUMN dog_run_locks.timezone_offset IS 'スマートロックのタイムゾーンオフセット（時間）';
COMMENT ON COLUMN dog_run_locks.api_credentials IS 'API接続に必要な認証情報（暗号化推奨）';
COMMENT ON COLUMN dog_run_locks.last_sync_at IS '最後にスマートロックと同期した日時';
COMMENT ON COLUMN dog_run_locks.battery_level IS 'スマートロックのバッテリー残量（%）';
COMMENT ON COLUMN dog_run_locks.firmware_version IS 'スマートロックのファームウェアバージョン';
COMMENT ON COLUMN access_logs.keyboard_pwd_version IS 'PIN管理のバージョン番号';
COMMENT ON COLUMN access_logs.lock_name IS '使用したロックの名前（複数ロック対応）';

-- サンプルデータ（開発環境用）
-- INSERT INTO dog_run_locks (name, lock_id, park_id, lock_type, installation_notes) 
-- SELECT 
--   'メインゲート',
--   'SCIENER_LOCK_001',
--   id,
--   'WiFi',
--   '正面入口、高さ1.5m位置に設置'
-- FROM dog_parks 
-- WHERE name = 'さくら公園ドッグラン'
-- LIMIT 1;
