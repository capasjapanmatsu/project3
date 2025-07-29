-- pet_facilitiesテーブルに営業日管理用のカラムを追加

-- 営業時間のカラムを追加
ALTER TABLE pet_facilities 
ADD COLUMN IF NOT EXISTS opening_time TIME DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS closing_time TIME DEFAULT '18:00';

-- 定休日設定のカラムを追加
ALTER TABLE pet_facilities 
ADD COLUMN IF NOT EXISTS weekly_closed_days JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS specific_closed_dates JSONB DEFAULT '[]';

-- コメントを追加
COMMENT ON COLUMN pet_facilities.opening_time IS '開店時間';
COMMENT ON COLUMN pet_facilities.closing_time IS '閉店時間';
COMMENT ON COLUMN pet_facilities.weekly_closed_days IS '定休日設定（日曜=0, 月曜=1, ..., 土曜=6のboolean配列）';
COMMENT ON COLUMN pet_facilities.specific_closed_dates IS '特定日の休業日設定（YYYY-MM-DD形式の文字列配列）';

-- インデックスを追加（検索の高速化）
CREATE INDEX IF NOT EXISTS idx_pet_facilities_opening_time ON pet_facilities(opening_time);
CREATE INDEX IF NOT EXISTS idx_pet_facilities_closing_time ON pet_facilities(closing_time); 