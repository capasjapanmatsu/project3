-- Remove sample dog parks data
-- This migration removes sample/test data that was created during development

-- Delete sample dog parks that are commonly used in development
DELETE FROM dog_parks 
WHERE name IN (
  '青空ドッグパーク',
  'みどりの森ドッグラン',
  '代々木ドッグパーク',
  '渋谷ドッグパーク',
  '新宿セントラルドッグラン',
  '代々木ファミリードッグラン',
  '恵比寿プレミアムドッグラン',
  '六本木ヒルズドッグテラス',
  '浅草伝統ドッグラン',
  '上野動物園前ドッグラン',
  '熊本城公園ドッグラン',
  'サンプルドッグラン'
);

-- Also remove any parks with null owner_id (these are typically sample data)
DELETE FROM dog_parks WHERE owner_id IS NULL;

-- Remove any parks that have been approved but created by sample data processes
DELETE FROM dog_parks 
WHERE status = 'approved' 
AND created_at < NOW() - INTERVAL '1 day'
AND description LIKE '%サンプル%';

-- Show remaining parks count
SELECT COUNT(*) as remaining_parks FROM dog_parks; 