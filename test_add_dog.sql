-- 新しいワンちゃんを追加するテスト用SQL

-- テスト用のワンちゃんを追加
INSERT INTO dogs (
  owner_id, 
  name, 
  breed, 
  birth_date, 
  gender, 
  image_url,
  created_at
) VALUES (
  'test-owner-' || extract(epoch from now())::text,
  'リアルタイムテスト犬',
  '柴犬',
  '2023-01-01',
  'オス',
  '',
  now()
);

-- 確認クエリ
SELECT 
  name, 
  breed, 
  gender,
  created_at,
  'リアルタイム追加成功！' as status
FROM dogs 
WHERE name = 'リアルタイムテスト犬'
ORDER BY created_at DESC 
LIMIT 1; 