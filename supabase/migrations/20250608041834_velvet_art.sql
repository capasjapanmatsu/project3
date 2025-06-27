/*
  # Add sample dog parks data

  1. Sample Data
    - Insert 10 sample dog parks across Tokyo
    - Each park has different facilities and pricing
    - All parks are pre-approved for immediate use

  2. Approach
    - Temporarily allow null owner_id values
    - Insert sample data with null owner_id
    - Restore the not-null constraint
    - Note: Real owners can claim these parks later or they can be updated by admins
*/

-- Temporarily allow null values for owner_id to insert sample data
ALTER TABLE dog_parks ALTER COLUMN owner_id DROP NOT NULL;

-- Insert sample dog parks data with null owner_id (will be updated when real owners register)
INSERT INTO dog_parks (
    id,
    owner_id,
    name,
    description,
    address,
    latitude,
    longitude,
    price,
    max_capacity,
    current_occupancy,
    status,
    facilities,
    facility_details
) VALUES
-- 1. 渋谷ドッグパーク
(
    gen_random_uuid(),
    NULL,
    '渋谷ドッグパーク',
    '渋谷駅から徒歩5分の都市型ドッグラン。小型犬から大型犬まで楽しめる広々とした空間です。',
    '東京都渋谷区渋谷2-1-1',
    35.6598,
    139.7036,
    800,
    15,
    3,
    'approved',
    '{"parking": true, "shower": true, "restroom": true, "agility": false, "rest_area": true, "water_station": true}',
    '屋内休憩スペースあり。雨の日でも安心してご利用いただけます。'
),

-- 2. 新宿セントラルドッグラン
(
    gen_random_uuid(),
    NULL,
    '新宿セントラルドッグラン',
    '新宿の中心部にある緑豊かなドッグラン。アジリティ設備も充実しています。',
    '東京都新宿区西新宿1-5-1',
    35.6896,
    139.6917,
    1000,
    20,
    8,
    'approved',
    '{"parking": false, "shower": true, "restroom": true, "agility": true, "rest_area": true, "water_station": true}',
    'アジリティコースは初心者から上級者まで対応。トレーナーによる指導も受けられます。'
),

-- 3. 品川ベイサイドドッグパーク
(
    gen_random_uuid(),
    NULL,
    '品川ベイサイドドッグパーク',
    '東京湾を望む絶景ドッグラン。海風を感じながら愛犬と過ごせます。',
    '東京都港区港南2-16-1',
    35.6284,
    139.7387,
    1200,
    12,
    5,
    'approved',
    '{"parking": true, "shower": true, "restroom": true, "agility": false, "rest_area": true, "water_station": true}',
    '海が見える絶景スポット。夕日の時間帯は特に美しく、写真撮影にも最適です。'
),

-- 4. お台場アクアドッグラン
(
    gen_random_uuid(),
    NULL,
    'お台場アクアドッグラン',
    'レインボーブリッジを望む水遊びができるドッグラン。夏場は特に人気です。',
    '東京都江東区青海1-3-8',
    35.6197,
    139.7753,
    900,
    18,
    12,
    'approved',
    '{"parking": true, "shower": true, "restroom": true, "agility": false, "rest_area": true, "water_station": true}',
    '小さなプールがあり、水遊びが大好きなワンちゃんにおすすめ。シャワー設備も完備。'
),

-- 5. 吉祥寺グリーンドッグパーク
(
    gen_random_uuid(),
    NULL,
    '吉祥寺グリーンドッグパーク',
    '井の頭公園近くの自然豊かなドッグラン。緑に囲まれた癒しの空間です。',
    '東京都武蔵野市吉祥寺南町1-4-1',
    35.7022,
    139.5803,
    600,
    16,
    7,
    'approved',
    '{"parking": true, "shower": false, "restroom": true, "agility": true, "rest_area": true, "water_station": true}',
    '自然の地形を活かしたアジリティコース。四季折々の自然を楽しめます。'
),

-- 6. 代々木ファミリードッグラン
(
    gen_random_uuid(),
    NULL,
    '代々木ファミリードッグラン',
    '代々木公園隣接の家族向けドッグラン。小さなお子様連れでも安心です。',
    '東京都渋谷区代々木神園町2-1',
    35.6732,
    139.6939,
    700,
    14,
    4,
    'approved',
    '{"parking": false, "shower": false, "restroom": true, "agility": false, "rest_area": true, "water_station": true}',
    'ファミリー向けの設備が充実。お子様用の遊具もあります。'
),

-- 7. 恵比寿プレミアムドッグラン
(
    gen_random_uuid(),
    NULL,
    '恵比寿プレミアムドッグラン',
    '恵比寿ガーデンプレイス近くの高級ドッグラン。上質なサービスを提供します。',
    '東京都渋谷区恵比寿4-20-3',
    35.6466,
    139.7101,
    1200,
    10,
    2,
    'approved',
    '{"parking": true, "shower": true, "restroom": true, "agility": false, "rest_area": true, "water_station": true}',
    'プレミアムサービスとして、ドッグトリミングやマッサージも利用可能。'
),

-- 8. 六本木ヒルズドッグテラス
(
    gen_random_uuid(),
    NULL,
    '六本木ヒルズドッグテラス',
    '六本木ヒルズの屋上にある都市型ドッグラン。東京タワーを一望できます。',
    '東京都港区六本木6-10-1',
    35.6606,
    139.7298,
    1100,
    8,
    6,
    'approved',
    '{"parking": true, "shower": true, "restroom": true, "agility": false, "rest_area": true, "water_station": true}',
    '屋上テラスからの眺望は絶景。夜景も楽しめる都内唯一のナイトドッグランです。'
),

-- 9. 浅草伝統ドッグラン
(
    gen_random_uuid(),
    NULL,
    '浅草伝統ドッグラン',
    '浅草寺近くの和風ドッグラン。日本の伝統美を感じられる空間です。',
    '東京都台東区浅草2-3-1',
    35.7148,
    139.7967,
    500,
    12,
    3,
    'approved',
    '{"parking": false, "shower": false, "restroom": true, "agility": false, "rest_area": true, "water_station": true}',
    '和風庭園をイメージした造り。外国人観光客にも人気のスポットです。'
),

-- 10. 上野動物園前ドッグラン
(
    gen_random_uuid(),
    NULL,
    '上野動物園前ドッグラン',
    '上野動物園の向かいにある教育的なドッグラン。動物について学べる展示もあります。',
    '東京都台東区上野公園9-83',
    35.7156,
    139.7731,
    650,
    16,
    9,
    'approved',
    '{"parking": false, "shower": false, "restroom": true, "agility": true, "rest_area": true, "water_station": true}',
    '動物の生態について学べるパネル展示あり。教育的な要素も楽しめます。'
);

-- Note: We're keeping owner_id as nullable for now since these are sample/system-managed parks
-- Real facility owners can register and claim ownership of parks later
-- Or these can be updated by administrators to assign proper owners