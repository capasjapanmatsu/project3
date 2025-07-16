-- dog_parksテーブルにサンプルデータを追加
-- 注意：本番環境では実行しないでください

-- まず、既存のサンプルデータを確認
SELECT * FROM dog_parks;

-- プロフィールテーブルにテストユーザーを追加（存在しない場合）
INSERT INTO profiles (id, name, email, phone, address, postal_code, created_at, updated_at)
VALUES 
  ('test-user-1', '松本太郎', 'capasprofutures@gmail.com', '080-1234-5678', '熊本県熊本市中央区', '860-0001', NOW(), NOW()),
  ('test-user-2', '田中花子', 'tanaka@example.com', '080-9876-5432', '熊本県八代市', '866-0001', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  postal_code = EXCLUDED.postal_code,
  updated_at = NOW();

-- dog_parksテーブルにサンプルデータを追加
INSERT INTO dog_parks (
  id,
  name,
  description,
  address,
  price,
  status,
  owner_id,
  created_at,
  max_capacity,
  large_dog_area,
  small_dog_area,
  private_booths,
  facilities,
  monthly_revenue,
  average_rating,
  review_count,
  facility_details,
  business_license,
  identity_verification,
  private_booth_count
) VALUES 
  (
    gen_random_uuid(),
    'ドッグラン菊池',
    '菊池の大自然の中のドッグランです',
    '熊本県菊池市',
    800,
    'pending',
    'test-user-1',
    NOW() - INTERVAL '2 days',
    10,
    true,
    true,
    false,
    '{"parking": true, "shower": false, "restroom": true, "agility": false, "rest_area": true, "water_station": true}'::jsonb,
    0,
    0,
    0,
    '駐車場完備、休憩エリアあり、給水所あり',
    'license123.jpg',
    'identity456.jpg',
    0
  ),
  (
    gen_random_uuid(),
    'ドッグラン庄本',
    '庄本のドッグランです',
    '熊本県山鹿市庄本',
    800,
    'approved',
    'test-user-2',
    NOW() - INTERVAL '5 days',
    10,
    true,
    true,
    false,
    '{"parking": true, "shower": true, "restroom": true, "agility": true, "rest_area": true, "water_station": true}'::jsonb,
    50000,
    4.5,
    12,
    '全設備完備の高品質ドッグラン',
    'license789.jpg',
    'identity012.jpg',
    2
  ),
  (
    gen_random_uuid(),
    'ドッグラン天草',
    '天草の海が見えるドッグランです',
    '熊本県天草市',
    1000,
    'first_stage_passed',
    'test-user-1',
    NOW() - INTERVAL '1 day',
    15,
    true,
    false,
    true,
    '{"parking": true, "shower": false, "restroom": true, "agility": false, "rest_area": true, "water_station": true}'::jsonb,
    0,
    0,
    0,
    '海が見える絶景ドッグラン、個室ブースあり',
    'license345.jpg',
    'identity678.jpg',
    3
  ),
  (
    gen_random_uuid(),
    'ドッグラン阿蘇',
    '阿蘇の雄大な自然の中のドッグランです',
    '熊本県阿蘇市',
    1200,
    'second_stage_review',
    'test-user-2',
    NOW() - INTERVAL '3 days',
    20,
    true,
    true,
    true,
    '{"parking": true, "shower": true, "restroom": true, "agility": true, "rest_area": true, "water_station": true}'::jsonb,
    0,
    0,
    0,
    '阿蘇の大自然を満喫できるプレミアムドッグラン',
    'license901.jpg',
    'identity234.jpg',
    5
  )
ON CONFLICT (id) DO NOTHING;

-- 結果を確認
SELECT 
  dp.id,
  dp.name,
  dp.status,
  dp.created_at,
  p.name as owner_name,
  p.email as owner_email
FROM dog_parks dp
LEFT JOIN profiles p ON dp.owner_id = p.id
ORDER BY dp.created_at DESC; 