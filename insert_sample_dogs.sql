-- サンプルの犬データを挿入
INSERT INTO dogs (name, breed, gender, age, weight, image_url, owner_id, created_at) VALUES
  ('ちび', '柴犬', 'オス', 3, 8.5, 'https://images.pexels.com/photos/58997/pexels-photo-58997.jpeg?auto=compress&cs=tinysrgb&w=300', (SELECT id FROM profiles WHERE user_type = 'user' LIMIT 1), NOW()),
  ('はな', 'トイプードル', 'メス', 2, 3.2, 'https://images.pexels.com/photos/422220/pexels-photo-422220.jpeg?auto=compress&cs=tinysrgb&w=300', (SELECT id FROM profiles WHERE user_type = 'user' LIMIT 1), NOW() - INTERVAL '1 day'),
  ('太郎', 'ゴールデンレトリーバー', 'オス', 4, 28.0, 'https://images.pexels.com/photos/160846/french-bulldog-summer-smile-joy-160846.jpeg?auto=compress&cs=tinysrgb&w=300', (SELECT id FROM profiles WHERE user_type = 'user' LIMIT 1), NOW() - INTERVAL '2 days'),
  ('さくら', 'チワワ', 'メス', 1, 2.1, 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=300', (SELECT id FROM profiles WHERE user_type = 'user' LIMIT 1), NOW() - INTERVAL '3 days'),
  ('コロ', 'ビーグル', 'オス', 5, 15.0, 'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg?auto=compress&cs=tinysrgb&w=300', (SELECT id FROM profiles WHERE user_type = 'user' LIMIT 1), NOW() - INTERVAL '4 days'),
  ('ルナ', 'ミニチュアダックスフンド', 'メス', 3, 5.8, 'https://images.pexels.com/photos/2023384/pexels-photo-2023384.jpeg?auto=compress&cs=tinysrgb&w=300', (SELECT id FROM profiles WHERE user_type = 'user' LIMIT 1), NOW() - INTERVAL '5 days'),
  ('マロン', 'ポメラニアン', 'オス', 2, 3.5, 'https://images.pexels.com/photos/97082/pexels-photo-97082.jpeg?auto=compress&cs=tinysrgb&w=300', (SELECT id FROM profiles WHERE user_type = 'user' LIMIT 1), NOW() - INTERVAL '6 days'),
  ('ココ', 'マルチーズ', 'メス', 4, 4.2, 'https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg?auto=compress&cs=tinysrgb&w=300', (SELECT id FROM profiles WHERE user_type = 'user' LIMIT 1), NOW() - INTERVAL '7 days');

-- 確認クエリ
SELECT COUNT(*) as total_dogs FROM dogs;
SELECT name, breed, gender, created_at FROM dogs ORDER BY created_at DESC LIMIT 10; 