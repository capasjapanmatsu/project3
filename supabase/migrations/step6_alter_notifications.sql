-- ============================================
-- 既存のnotificationsテーブルを拡張
-- ============================================

-- 既存のnotificationsテーブルに新しいカラムを追加
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS related_dog_id UUID REFERENCES dogs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS related_park_id UUID REFERENCES dog_parks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- readカラムをis_readにリネーム（もし存在する場合）
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'notifications' 
             AND column_name = 'read'
             AND table_schema = 'public') THEN
    ALTER TABLE notifications RENAME COLUMN read TO is_read;
  END IF;
END $$;

-- typeカラムに新しい値を許可する制約を追加
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('friend_entered', 'blacklist_alert', 'system', 'recommendation', 
                  'park_update', 'maintenance', 'coupon', 'promotion'));

-- notificationsのインデックスを作成
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
