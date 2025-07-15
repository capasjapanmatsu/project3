-- サンプルドッグランデータの挿入
-- 既存のドッグランデータを確認して挿入

-- まず、既存のデータを確認
SELECT id, name, status FROM dog_parks LIMIT 10;

-- 既存のデータが少ない場合、サンプルデータを挿入
INSERT INTO dog_parks (
    id,
    name,
    address,
    latitude,
    longitude,
    description,
    max_capacity,
    current_occupancy,
    status,
    large_dog_area,
    small_dog_area,
    private_booths,
    private_booth_count,
    facilities,
    image_url,
    created_at,
    updated_at
) VALUES 
-- 東京エリア
(
    gen_random_uuid(),
    '渋谷ドッグパーク',
    '東京都渋谷区渋谷1-1-1',
    35.6598,
    139.7006,
    '渋谷駅から徒歩5分の都心型ドッグラン。小型犬から大型犬まで安全に遊べます。',
    20,
    5,
    'approved',
    true,
    true,
    true,
    3,
    '{"parking": true, "shower": true, "restroom": true, "agility": true, "rest_area": true, "water_station": true}',
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg',
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    '新宿ペット広場',
    '東京都新宿区新宿2-2-2',
    35.6896,
    139.6917,
    '新宿の中心地にあるアクセス抜群のドッグラン。アジリティ設備充実。',
    25,
    8,
    'approved',
    true,
    true,
    true,
    2,
    '{"parking": false, "shower": true, "restroom": true, "agility": true, "rest_area": true, "water_station": true}',
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg',
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'お台場ドッグラン',
    '東京都港区台場1-3-1',
    35.6269,
    139.7764,
    '東京湾を望む絶景ドッグラン。広々とした敷地で愛犬ものびのび。',
    30,
    12,
    'approved',
    true,
    true,
    true,
    4,
    '{"parking": true, "shower": true, "restroom": true, "agility": false, "rest_area": true, "water_station": true}',
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg',
    NOW(),
    NOW()
),
-- 大阪エリア
(
    gen_random_uuid(),
    '大阪城ドッグパーク',
    '大阪府大阪市中央区大阪城1-1',
    34.6873,
    135.5262,
    '大阪城公園内の緑豊かなドッグラン。歴史を感じながら愛犬と散歩。',
    35,
    15,
    'approved',
    true,
    true,
    true,
    5,
    '{"parking": true, "shower": true, "restroom": true, "agility": true, "rest_area": true, "water_station": true}',
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg',
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    '梅田ペットプラザ',
    '大阪府大阪市北区梅田1-1-1',
    34.7024,
    135.4959,
    '梅田駅直結の屋内型ドッグラン。雨の日でも安心して利用できます。',
    15,
    6,
    'approved',
    true,
    true,
    true,
    2,
    '{"parking": true, "shower": true, "restroom": true, "agility": false, "rest_area": true, "water_station": true}',
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg',
    NOW(),
    NOW()
),
-- 名古屋エリア
(
    gen_random_uuid(),
    '名古屋ドッグガーデン',
    '愛知県名古屋市中区栄1-1-1',
    35.1681,
    136.9066,
    '名古屋の中心地栄にある都市型ドッグラン。ショッピングの合間に利用できます。',
    22,
    9,
    'approved',
    true,
    true,
    true,
    3,
    '{"parking": true, "shower": true, "restroom": true, "agility": true, "rest_area": true, "water_station": true}',
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg',
    NOW(),
    NOW()
),
-- 福岡エリア
(
    gen_random_uuid(),
    '博多ドッグパーク',
    '福岡県福岡市博多区博多駅前1-1-1',
    33.5904,
    130.4017,
    '博多駅から徒歩圏内のアクセス抜群ドッグラン。九州最大級の設備。',
    40,
    18,
    'approved',
    true,
    true,
    true,
    6,
    '{"parking": true, "shower": true, "restroom": true, "agility": true, "rest_area": true, "water_station": true}',
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 挿入後のデータ確認
SELECT COUNT(*) as total_parks FROM dog_parks;
SELECT COUNT(*) as approved_parks FROM dog_parks WHERE status = 'approved';
SELECT name, address, status FROM dog_parks ORDER BY created_at DESC LIMIT 5; 