-- 施設データベースに実際のデータを挿入
-- 新しいカテゴリも含めて、承認済みの施設データを追加

-- まず、pet_facilitiesテーブルのカテゴリ制約を更新
ALTER TABLE pet_facilities DROP CONSTRAINT IF EXISTS pet_facilities_category_id_check;
ALTER TABLE pet_facilities ADD CONSTRAINT pet_facilities_category_id_check 
  CHECK (category_id IN (
    'pet_hotel', 
    'pet_salon', 
    'veterinary', 
    'pet_cafe', 
    'pet_restaurant', 
    'pet_shop', 
    'pet_accommodation',
    'dog_training',
    'pet_friendly_other'
  ));

-- 実際の施設データを挿入
INSERT INTO pet_facilities (
  owner_id,
  name,
  category_id,
  address,
  latitude,
  longitude,
  phone,
  website,
  description,
  status,
  created_at
) VALUES
-- ペットホテル
(
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '渋谷ペットホテル・ワンワン',
  'pet_hotel',
  '東京都渋谷区渋谷2-1-1',
  35.6598,
  139.7036,
  '03-1234-5678',
  'https://shibuya-wanwan.com',
  '24時間体制でペットのお世話をいたします。清潔で安全な環境を提供。',
  'approved',
  now() - interval '5 days'
),

-- ペットサロン
(
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  'ペットサロン花',
  'pet_salon',
  '東京都新宿区新宿3-2-2',
  35.6918,
  139.7046,
  '03-2345-6789',
  'https://salon-hana.com',
  '愛犬の美容とリラクゼーションを提供するペットサロンです。',
  'approved',
  now() - interval '4 days'
),

-- 動物病院
(
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '品川動物病院',
  'veterinary',
  '東京都港区品川4-3-3',
  35.6264,
  139.7397,
  '03-3456-7890',
  'https://shinagawa-vet.com',
  '24時間対応の動物病院。緊急時も安心してご相談ください。',
  'approved',
  now() - interval '3 days'
),

-- ペットカフェ
(
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  'ドッグカフェ・プピー',
  'pet_cafe',
  '東京都豊島区池袋5-4-4',
  35.7285,
  139.7119,
  '03-4567-8901',
  'https://dogcafe-puppy.com',
  'かわいい子犬と触れ合えるペットカフェ。美味しいコーヒーとスイーツも。',
  'approved',
  now() - interval '2 days'
),

-- ペット同伴レストラン
(
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  'レストラン・ペットフレンドリー',
  'pet_restaurant',
  '東京都中央区銀座6-5-5',
  35.6717,
  139.7640,
  '03-5678-9012',
  'https://petfriendly-ginza.com',
  'ペットと一緒にお食事を楽しめるレストラン。テラス席完備。',
  'approved',
  now() - interval '1 day'
),

-- ペットショップ
(
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  'ペットワールド東京',
  'pet_shop',
  '東京都世田谷区三軒茶屋7-6-6',
  35.6439,
  139.6691,
  '03-6789-0123',
  'https://petworld-tokyo.com',
  'ペット用品とフードの専門店。豊富な品揃えと専門スタッフがサポート。',
  'approved',
  now() - interval '6 days'
),

-- ペット同伴宿泊
(
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  'ペットリゾート箱根',
  'pet_accommodation',
  '神奈川県足柄下郡箱根町仙石原8-7-7',
  35.2394,
  139.0235,
  '0460-1234-5678',
  'https://petresort-hakone.com',
  'ペットと一緒に宿泊できるリゾートホテル。温泉とドッグランも完備。',
  'approved',
  now() - interval '7 days'
),

-- しつけ教室（新カテゴリ）
(
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  'ドッグトレーニング・スクール東京',
  'dog_training',
  '東京都練馬区石神井公園9-8-8',
  35.7357,
  139.5941,
  '03-7890-1234',
  'https://dogtraining-tokyo.com',
  'プロのトレーナーによる犬のしつけ教室。個別指導からグループレッスンまで。',
  'approved',
  now() - interval '8 days'
),

-- その他ワンちゃん同伴可能施設（新カテゴリ）
(
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  'ペット同伴OK・アウトレットモール',
  'pet_friendly_other',
  '東京都江東区有明10-9-9',
  35.6306,
  139.7947,
  '03-8901-2345',
  'https://petok-outlet.com',
  'ペット同伴でショッピングを楽しめるアウトレットモール。ペット専用休憩エリアあり。',
  'approved',
  now() - interval '9 days'
)
ON CONFLICT (id) DO NOTHING;

-- 挿入された件数を確認
SELECT 
  category_id,
  COUNT(*) as count,
  string_agg(name, ', ') as facility_names
FROM pet_facilities 
WHERE status = 'approved'
GROUP BY category_id
ORDER BY category_id; 