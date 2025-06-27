/*
  # Add dog size categories and private booth features

  1. New Columns
    - `large_dog_area` (boolean) - 大型犬エリアの有無
    - `small_dog_area` (boolean) - 小型犬エリアの有無
    - `private_booths` (boolean) - 貸し切りブースの有無
    - `private_booth_count` (integer) - 貸し切りブース数
    - `private_booth_price` (integer) - 貸し切りブース料金（1時間あたり）

  2. Updates
    - 既存のドッグランデータに新しい項目を追加
*/

-- Add new columns to dog_parks table
ALTER TABLE dog_parks 
ADD COLUMN IF NOT EXISTS large_dog_area boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS small_dog_area boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS private_booths boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS private_booth_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS private_booth_price integer DEFAULT 0;

-- Add constraints
ALTER TABLE dog_parks 
ADD CONSTRAINT dog_parks_private_booth_count_check CHECK (private_booth_count >= 0),
ADD CONSTRAINT dog_parks_private_booth_price_check CHECK (private_booth_price >= 0);

-- Update existing Tokyo parks with dog size and private booth information
UPDATE dog_parks SET 
  large_dog_area = true,
  small_dog_area = true,
  private_booths = true,
  private_booth_count = 2,
  private_booth_price = 1500
WHERE name = '渋谷ドッグパーク';

UPDATE dog_parks SET 
  large_dog_area = true,
  small_dog_area = true,
  private_booths = true,
  private_booth_count = 3,
  private_booth_price = 1800
WHERE name = '新宿セントラルドッグラン';

UPDATE dog_parks SET 
  large_dog_area = true,
  small_dog_area = false,
  private_booths = true,
  private_booth_count = 1,
  private_booth_price = 2000
WHERE name = '品川ベイサイドドッグパーク';

UPDATE dog_parks SET 
  large_dog_area = true,
  small_dog_area = true,
  private_booths = false,
  private_booth_count = 0,
  private_booth_price = 0
WHERE name = 'お台場アクアドッグラン';

UPDATE dog_parks SET 
  large_dog_area = true,
  small_dog_area = true,
  private_booths = true,
  private_booth_count = 2,
  private_booth_price = 1200
WHERE name = '吉祥寺グリーンドッグパーク';

UPDATE dog_parks SET 
  large_dog_area = false,
  small_dog_area = true,
  private_booths = true,
  private_booth_count = 4,
  private_booth_price = 1000
WHERE name = '代々木ファミリードッグラン';

UPDATE dog_parks SET 
  large_dog_area = true,
  small_dog_area = true,
  private_booths = true,
  private_booth_count = 2,
  private_booth_price = 2500
WHERE name = '恵比寿プレミアムドッグラン';

UPDATE dog_parks SET 
  large_dog_area = false,
  small_dog_area = true,
  private_booths = true,
  private_booth_count = 1,
  private_booth_price = 3000
WHERE name = '六本木ヒルズドッグテラス';

UPDATE dog_parks SET 
  large_dog_area = false,
  small_dog_area = true,
  private_booths = false,
  private_booth_count = 0,
  private_booth_price = 0
WHERE name = '浅草伝統ドッグラン';

UPDATE dog_parks SET 
  large_dog_area = true,
  small_dog_area = true,
  private_booths = false,
  private_booth_count = 0,
  private_booth_price = 0
WHERE name = '上野動物園前ドッグラン';

-- Update Kumamoto parks with dog size and private booth information
UPDATE dog_parks SET 
  large_dog_area = true,
  small_dog_area = true,
  private_booths = false,
  private_booth_count = 0,
  private_booth_price = 0
WHERE name = '熊本城公園ドッグラン';

UPDATE dog_parks SET 
  large_dog_area = true,
  small_dog_area = true,
  private_booths = true,
  private_booth_count = 3,
  private_booth_price = 1500
WHERE name = '阿蘇草原ドッグパーク';

UPDATE dog_parks SET 
  large_dog_area = false,
  small_dog_area = true,
  private_booths = true,
  private_booth_count = 2,
  private_booth_price = 1800
WHERE name = '水前寺成趣園ドッグラン';

UPDATE dog_parks SET 
  large_dog_area = true,
  small_dog_area = true,
  private_booths = true,
  private_booth_count = 2,
  private_booth_price = 2000
WHERE name = '天草イルカドッグビーチ';

UPDATE dog_parks SET 
  large_dog_area = true,
  small_dog_area = true,
  private_booths = false,
  private_booth_count = 0,
  private_booth_price = 0
WHERE name = '菊池渓谷ネイチャードッグラン';

UPDATE dog_parks SET 
  large_dog_area = true,
  small_dog_area = true,
  private_booths = true,
  private_booth_count = 1,
  private_booth_price = 1500
WHERE name = '人吉球磨川ドッグラン';

UPDATE dog_parks SET 
  large_dog_area = false,
  small_dog_area = true,
  private_booths = true,
  private_booth_count = 3,
  private_booth_price = 2200
WHERE name = '山鹿温泉ドッグスパ';

UPDATE dog_parks SET 
  large_dog_area = true,
  small_dog_area = true,
  private_booths = true,
  private_booth_count = 1,
  private_booth_price = 1800
WHERE name = '宇土マリーナドッグパーク';