-- テスト用施設データの作成
-- 注意: Supabaseダッシュボードで実行してください

-- 1. テスト用の施設データを挿入
INSERT INTO facilities (
  name,
  category_id,
  address,
  phone,
  website,
  description,
  status,
  owner_id,
  latitude,
  longitude
) VALUES 
-- 承認待ちの施設
(
  'テストドッグパーク1',
  'dog_park',
  '東京都渋谷区テスト町1-1-1',
  '03-1234-5678',
  'https://test-dogpark1.com',
  'テスト用のドッグパークです。承認待ち状態です。',
  'pending',
  auth.uid(), -- 現在のユーザーID
  35.658584,
  139.745438
),
(
  'テスト動物病院',
  'veterinary',
  '東京都新宿区テスト町2-2-2',
  '03-2345-6789',
  'https://test-vet.com',
  'テスト用の動物病院です。承認待ち状態です。',
  'pending',
  auth.uid(),
  35.689487,
  139.691711
),
-- 承認済みの施設
(
  'テストペットホテル',
  'pet_hotel',
  '東京都港区テスト町3-3-3',
  '03-3456-7890',
  'https://test-hotel.com',
  'テスト用のペットホテルです。承認済み状態です。',
  'approved',
  auth.uid(),
  35.658034,
  139.751739
),
(
  'テストペットショップ',
  'pet_shop',
  '東京都品川区テスト町4-4-4',
  '03-4567-8901',
  'https://test-shop.com',
  'テスト用のペットショップです。承認済み状態です。',
  'approved',
  auth.uid(),
  35.630152,
  139.740367
);

-- 2. 作成したデータを確認
SELECT 
  id,
  name,
  category_id,
  status,
  owner_id,
  created_at
FROM facilities
ORDER BY created_at DESC
LIMIT 10;
