-- ============================================
-- ステップ6: パート1 - テーブルの作成のみ
-- ============================================

-- 1. access_logsテーブルの拡張
ALTER TABLE access_logs 
ADD COLUMN IF NOT EXISTS dog_id UUID REFERENCES dogs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS dog_run_id UUID REFERENCES dog_parks(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS duration INTEGER;

-- 2. dog_park_stats テーブルの作成
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

-- 3. shared_access_logs テーブルの作成
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

-- 4. friendships テーブルの作成
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

-- 5. blacklists テーブルの作成
CREATE TABLE IF NOT EXISTS blacklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, blocked_dog_id)
);

-- 6. notifications テーブル
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
