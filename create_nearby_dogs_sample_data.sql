-- 近くのワンちゃんたち機能用のサンプルデータ作成
-- このファイルを実行して、コミュニティ機能をテストできるようにします

-- サンプルデータ作成関数
CREATE OR REPLACE FUNCTION create_nearby_dogs_sample_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sample_user_1 uuid := gen_random_uuid();
  sample_user_2 uuid := gen_random_uuid();
  sample_user_3 uuid := gen_random_uuid();
  sample_user_4 uuid := gen_random_uuid();
  sample_user_5 uuid := gen_random_uuid();
BEGIN
  -- サンプルユーザーのプロフィールを作成
  INSERT INTO profiles (id, user_type, name, postal_code, address, phone_number, created_at)
  VALUES 
    (sample_user_1, 'user', '田中さん', '150-0001', '東京都渋谷区神宮前1-1-1', '090-1111-1111', now() - interval '30 days'),
    (sample_user_2, 'user', '佐藤さん', '150-0002', '東京都渋谷区渋谷2-2-2', '090-2222-2222', now() - interval '25 days'),
    (sample_user_3, 'user', '鈴木さん', '150-0003', '東京都渋谷区原宿3-3-3', '090-3333-3333', now() - interval '20 days'),
    (sample_user_4, 'user', '高橋さん', '150-0004', '東京都渋谷区恵比寿4-4-4', '090-4444-4444', now() - interval '15 days'),
    (sample_user_5, 'user', '伊藤さん', '150-0005', '東京都渋谷区代官山5-5-5', '090-5555-5555', now() - interval '10 days')
  ON CONFLICT (id) DO NOTHING;

  -- サンプルの犬を作成（様々な犬種と年齢）
  INSERT INTO dogs (owner_id, name, breed, birth_date, gender, image_url, created_at)
  VALUES 
    -- 田中さんの犬
    (sample_user_1, 'チョコ', 'トイプードル', '2022-03-15', 'オス', 'https://images.pexels.com/photos/2023384/pexels-photo-2023384.jpeg', now() - interval '30 days'),
    (sample_user_1, 'モカ', 'トイプードル', '2021-05-20', 'メス', 'https://images.pexels.com/photos/1458916/pexels-photo-1458916.jpeg', now() - interval '30 days'),
    
    -- 佐藤さんの犬
    (sample_user_2, 'ハナ', 'チワワ', '2023-01-10', 'メス', 'https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg', now() - interval '25 days'),
    (sample_user_2, 'ポチ', 'チワワ', '2020-12-05', 'オス', 'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg', now() - interval '25 days'),
    
    -- 鈴木さんの犬
    (sample_user_3, 'さくら', 'ポメラニアン', '2022-09-30', 'メス', 'https://images.pexels.com/photos/3683107/pexels-photo-3683107.jpeg', now() - interval '20 days'),
    (sample_user_3, 'コテツ', 'ポメラニアン', '2021-07-12', 'オス', 'https://images.pexels.com/photos/3726314/pexels-photo-3726314.jpeg', now() - interval '20 days'),
    
    -- 高橋さんの犬
    (sample_user_4, 'ルナ', 'ゴールデンレトリバー', '2020-04-18', 'メス', 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg', now() - interval '15 days'),
    (sample_user_4, 'レオ', 'ラブラドール', '2019-11-02', 'オス', 'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg', now() - interval '15 days'),
    
    -- 伊藤さんの犬
    (sample_user_5, 'ミルク', 'マルチーズ', '2023-06-25', 'メス', 'https://images.pexels.com/photos/2174465/pexels-photo-2174465.jpeg', now() - interval '10 days'),
    (sample_user_5, 'ココ', 'ヨークシャーテリア', '2022-02-14', 'メス', 'https://images.pexels.com/photos/3662973/pexels-photo-3662973.jpeg', now() - interval '10 days'),
    (sample_user_5, 'ライト', 'フレンチブルドッグ', '2021-08-30', 'オス', 'https://images.pexels.com/photos/4124723/pexels-photo-4124723.jpeg', now() - interval '10 days');

  -- 全ての犬にワクチン証明書を作成（承認済み）
  INSERT INTO vaccine_certifications (dog_id, status, approved_at, created_at, rabies_expiry_date, combo_expiry_date)
  SELECT 
    d.id,
    'approved',
    now() - interval '5 days',
    now() - interval '10 days',
    (now() + interval '1 year')::date,
    (now() + interval '1 year')::date
  FROM dogs d
  WHERE d.owner_id IN (sample_user_1, sample_user_2, sample_user_3, sample_user_4, sample_user_5)
  ON CONFLICT (dog_id) DO NOTHING;

  RAISE NOTICE 'Sample data created: 5 users with 11 dogs total';
  RAISE NOTICE 'You can now test the "Near by Dogs" feature in the Community page';
  
END $$;

-- 関数を実行してサンプルデータを作成
SELECT create_nearby_dogs_sample_data();

-- 関数を削除（一度だけ実行すればよいので）
DROP FUNCTION create_nearby_dogs_sample_data(); 