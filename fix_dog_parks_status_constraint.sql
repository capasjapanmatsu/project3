-- dog_parks テーブルの status 制約を更新
-- 新しいワークフローのステータス値を許可するように修正

-- 既存の制約を削除（存在する場合）
ALTER TABLE dog_parks DROP CONSTRAINT IF EXISTS dog_parks_status_check;

-- 新しい制約を追加
ALTER TABLE dog_parks ADD CONSTRAINT dog_parks_status_check 
CHECK (status IN (
  'pending',
  'first_stage_passed',
  'second_stage_waiting',
  'second_stage_review', 
  'smart_lock_testing',
  'approved',
  'rejected'
));

-- 制約が正しく追加されたかを確認
SELECT conname, consrc FROM pg_constraint 
WHERE conrelid = 'dog_parks'::regclass 
AND conname = 'dog_parks_status_check'; 