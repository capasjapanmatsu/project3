/*
  # Add park images and Kumamoto sample data

  1. Schema Changes
    - Add image_url column to dog_parks table for park photos
    - Add cover_image_url column for hero/cover images

  2. Sample Data
    - Update existing Tokyo parks with beautiful stock images
    - Add 8 new sample dog parks in Kumamoto Prefecture
    - All parks include realistic images from Pexels

  3. Features
    - Mix of urban and nature parks
    - Varied pricing and facilities
    - Realistic locations across Kumamoto
*/

-- Add image columns to dog_parks table
ALTER TABLE dog_parks 
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS cover_image_url text;

-- Update existing Tokyo parks with images
UPDATE dog_parks SET 
  image_url = 'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg',
  cover_image_url = 'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg'
WHERE name = '渋谷ドッグパーク';

UPDATE dog_parks SET 
  image_url = 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg',
  cover_image_url = 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg'
WHERE name = '新宿セントラルドッグラン';

UPDATE dog_parks SET 
  image_url = 'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg',
  cover_image_url = 'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg'
WHERE name = '品川ベイサイドドッグパーク';

UPDATE dog_parks SET 
  image_url = 'https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg',
  cover_image_url = 'https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg'
WHERE name = 'お台場アクアドッグラン';

UPDATE dog_parks SET 
  image_url = 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg',
  cover_image_url = 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg'
WHERE name = '吉祥寺グリーンドッグパーク';

UPDATE dog_parks SET 
  image_url = 'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg',
  cover_image_url = 'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg'
WHERE name = '代々木ファミリードッグラン';

UPDATE dog_parks SET 
  image_url = 'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg',
  cover_image_url = 'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg'
WHERE name = '恵比寿プレミアムドッグラン';

UPDATE dog_parks SET 
  image_url = 'https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg',
  cover_image_url = 'https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg'
WHERE name = '六本木ヒルズドッグテラス';

UPDATE dog_parks SET 
  image_url = 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg',
  cover_image_url = 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg'
WHERE name = '浅草伝統ドッグラン';

UPDATE dog_parks SET 
  image_url = 'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg',
  cover_image_url = 'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg'
WHERE name = '上野動物園前ドッグラン';

-- Insert Kumamoto sample dog parks
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
    facility_details,
    image_url,
    cover_image_url
) VALUES
-- 1. 熊本城公園ドッグラン
(
    gen_random_uuid(),
    NULL,
    '熊本城公園ドッグラン',
    '熊本城を望む歴史ある公園内のドッグラン。桜の季節は特に美しく、愛犬との散歩に最適です。',
    '熊本県熊本市中央区本丸1-1',
    32.8064,
    130.7056,
    600,
    20,
    5,
    'approved',
    '{"parking": true, "shower": false, "restroom": true, "agility": false, "rest_area": true, "water_station": true}',
    '熊本城の石垣を眺めながら愛犬と過ごせる贅沢な空間。歴史を感じる散歩コースもあります。',
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg',
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg'
),

-- 2. 阿蘇草原ドッグパーク
(
    gen_random_uuid(),
    NULL,
    '阿蘇草原ドッグパーク',
    '阿蘇の大自然に囲まれた広大なドッグラン。360度のパノラマビューが楽しめます。',
    '熊本県阿蘇市一の宮町宮地5819-1',
    32.9511,
    131.1069,
    800,
    25,
    8,
    'approved',
    '{"parking": true, "shower": true, "restroom": true, "agility": true, "rest_area": true, "water_station": true}',
    '阿蘇五岳を一望できる絶景ドッグラン。広大な敷地で大型犬も思いっきり走れます。',
    'https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg',
    'https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg'
),

-- 3. 水前寺成趣園ドッグラン
(
    gen_random_uuid(),
    NULL,
    '水前寺成趣園ドッグラン',
    '日本庭園の美しさを愛犬と共に楽しめる和風ドッグラン。四季折々の風景が魅力です。',
    '熊本県熊本市中央区水前寺公園8-1',
    32.7890,
    130.7420,
    700,
    15,
    3,
    'approved',
    '{"parking": true, "shower": false, "restroom": true, "agility": false, "rest_area": true, "water_station": true}',
    '桃山式回遊庭園をイメージした美しい景観。池や築山を眺めながらの散歩は格別です。',
    'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg',
    'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg'
),

-- 4. 天草イルカドッグビーチ
(
    gen_random_uuid(),
    NULL,
    '天草イルカドッグビーチ',
    '天草の美しい海岸線で愛犬と海遊びが楽しめるビーチドッグラン。イルカウォッチングも人気。',
    '熊本県天草市五和町二江4689-1',
    32.4500,
    130.1833,
    900,
    18,
    12,
    'approved',
    '{"parking": true, "shower": true, "restroom": true, "agility": false, "rest_area": true, "water_station": true}',
    '海水浴ができる珍しいドッグビーチ。シャワー完備で海遊び後も安心です。',
    'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg',
    'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg'
),

-- 5. 菊池渓谷ネイチャードッグラン
(
    gen_random_uuid(),
    NULL,
    '菊池渓谷ネイチャードッグラン',
    '清流と緑豊かな森林に囲まれた自然派ドッグラン。マイナスイオンたっぷりの癒し空間。',
    '熊本県菊池市原5026',
    32.9833,
    130.8167,
    500,
    22,
    6,
    'approved',
    '{"parking": true, "shower": false, "restroom": true, "agility": true, "rest_area": true, "water_station": true}',
    '渓谷の清流で水遊びも可能。自然のアジリティコースで愛犬の運動能力向上にも最適。',
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg',
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg'
),

-- 6. 人吉球磨川ドッグラン
(
    gen_random_uuid(),
    NULL,
    '人吉球磨川ドッグラン',
    '日本三大急流の球磨川沿いにある風光明媚なドッグラン。川遊びも楽しめます。',
    '熊本県人吉市麓町14',
    32.2097,
    130.7631,
    650,
    16,
    4,
    'approved',
    '{"parking": true, "shower": true, "restroom": true, "agility": false, "rest_area": true, "water_station": true}',
    '球磨川での川遊びが人気。ラフティング見学もでき、愛犬と一緒にアクティビティを満喫。',
    'https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg',
    'https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg'
),

-- 7. 山鹿温泉ドッグスパ
(
    gen_random_uuid(),
    NULL,
    '山鹿温泉ドッグスパ',
    '温泉地ならではのペット専用温浴施設併設ドッグラン。愛犬も温泉でリラックス。',
    '熊本県山鹿市山鹿1-1',
    33.0167,
    130.6917,
    1000,
    12,
    7,
    'approved',
    '{"parking": true, "shower": true, "restroom": true, "agility": false, "rest_area": true, "water_station": true}',
    'ペット専用温浴施設とトリミングサロンを併設。愛犬の美容と健康をトータルケア。',
    'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg',
    'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg'
),

-- 8. 宇土マリーナドッグパーク
(
    gen_random_uuid(),
    NULL,
    '宇土マリーナドッグパーク',
    '有明海を一望できるマリーナ併設のドッグラン。海風を感じながら愛犬とのんびり過ごせます。',
    '熊本県宇土市下網田町3084-1',
    32.6500,
    130.6167,
    750,
    14,
    9,
    'approved',
    '{"parking": true, "shower": true, "restroom": true, "agility": false, "rest_area": true, "water_station": true}',
    'ヨットハーバーを眺めながらの散歩は格別。夕日の時間帯は特にロマンチックです。',
    'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg',
    'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg'
);