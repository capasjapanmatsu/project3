/*
  # コミュニティセクションのサンプルデータ

  1. 新規データ
    - サンプル犬の追加（画像付き）
    - 犬の出会い記録
    - 友達関係
    - 友達申請
    - ブラックリスト
  
  2. 表示改善
    - 犬の画像を表示
    - 犬の名前に「ちゃん」を追加
*/

-- サンプルデータ生成関数
CREATE OR REPLACE FUNCTION create_community_samples()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- ユーザーID変数
  user_id uuid;
  -- 犬のID変数
  dog1_id uuid;
  dog2_id uuid;
  dog3_id uuid;
  dog4_id uuid;
  dog5_id uuid;
  -- ドッグパークID
  sample_park_id uuid := gen_random_uuid();
BEGIN
  -- 現在のユーザーIDを取得
  SELECT auth.uid() INTO user_id;
  
  -- ユーザーが存在する場合
  IF user_id IS NOT NULL THEN
    -- サンプルドッグパーク作成
    INSERT INTO dog_parks (id, owner_id, name, description, address, price, status, facilities, max_capacity)
    VALUES
      (sample_park_id, user_id, '代々木ドッグパーク', '緑豊かな環境で愛犬と楽しい時間を過ごせます', '東京都渋谷区代々木2-1-1', 800, 'approved', 
       '{"parking": true, "shower": true, "restroom": true, "agility": true, "rest_area": true, "water_station": true}', 20)
    ON CONFLICT DO NOTHING;
    
    -- サンプル犬を作成（画像付き）
    INSERT INTO dogs (owner_id, name, breed, birth_date, gender, created_at, image_url)
    VALUES
      (user_id, 'モカ', 'トイプードル', '2022-03-15', 'メス', now() - interval '30 days', 'https://images.pexels.com/photos/2023384/pexels-photo-2023384.jpeg')
    RETURNING id INTO dog1_id;
    
    -- ワクチン証明書を作成
    INSERT INTO vaccine_certifications (dog_id, status, approved_at, created_at, rabies_expiry_date, combo_expiry_date)
    VALUES
      (dog1_id, 'approved', now() - interval '25 days', now() - interval '30 days', now() + interval '1 year', now() + interval '1 year')
    ON CONFLICT DO NOTHING;
    
    -- サンプル友達の犬を作成
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, gender, created_at, image_url)
    VALUES
      (gen_random_uuid(), user_id, 'チョコ', 'チワワ', '2021-05-10', 'オス', now() - interval '60 days', 'https://images.pexels.com/photos/1458916/pexels-photo-1458916.jpeg')
    RETURNING id INTO dog2_id;
    
    INSERT INTO vaccine_certifications (dog_id, status, approved_at, created_at, rabies_expiry_date, combo_expiry_date)
    VALUES
      (dog2_id, 'approved', now() - interval '55 days', now() - interval '60 days', now() + interval '1 year', now() + interval '1 year')
    ON CONFLICT DO NOTHING;
    
    -- 他のユーザーの犬を作成（友達用）
    INSERT INTO profiles (id, user_type, name, created_at)
    VALUES
      (gen_random_uuid(), 'user', '田中さくら', now() - interval '90 days')
    ON CONFLICT DO NOTHING
    RETURNING id INTO user_id;
    
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, gender, created_at, image_url)
    VALUES
      (gen_random_uuid(), user_id, 'マロン', 'ポメラニアン', '2020-12-05', 'メス', now() - interval '85 days', 'https://images.pexels.com/photos/2607544/pexels-photo-2607544.jpeg')
    RETURNING id INTO dog3_id;
    
    INSERT INTO vaccine_certifications (dog_id, status, approved_at, created_at, rabies_expiry_date, combo_expiry_date)
    VALUES
      (dog3_id, 'approved', now() - interval '80 days', now() - interval '85 days', now() + interval '1 year', now() + interval '1 year')
    ON CONFLICT DO NOTHING;
    
    -- 友達申請用のユーザーと犬
    INSERT INTO profiles (id, user_type, name, created_at)
    VALUES
      (gen_random_uuid(), 'user', '佐藤健太', now() - interval '45 days')
    ON CONFLICT DO NOTHING
    RETURNING id INTO user_id;
    
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, gender, created_at, image_url)
    VALUES
      (gen_random_uuid(), user_id, 'ココ', '柴犬', '2021-08-20', 'メス', now() - interval '40 days', 'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg')
    RETURNING id INTO dog4_id;
    
    INSERT INTO vaccine_certifications (dog_id, status, approved_at, created_at, rabies_expiry_date, combo_expiry_date)
    VALUES
      (dog4_id, 'approved', now() - interval '35 days', now() - interval '40 days', now() + interval '1 year', now() + interval '1 year')
    ON CONFLICT DO NOTHING;
    
    -- ブラックリスト用のユーザーと犬
    INSERT INTO profiles (id, user_type, name, created_at)
    VALUES
      (gen_random_uuid(), 'user', '鈴木一郎', now() - interval '120 days')
    ON CONFLICT DO NOTHING
    RETURNING id INTO user_id;
    
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, gender, created_at, image_url)
    VALUES
      (gen_random_uuid(), user_id, 'レオ', 'ラブラドールレトリバー', '2020-04-15', 'オス', now() - interval '115 days', 'https://images.pexels.com/photos/1490908/pexels-photo-1490908.jpeg')
    RETURNING id INTO dog5_id;
    
    INSERT INTO vaccine_certifications (dog_id, status, approved_at, created_at, rabies_expiry_date, combo_expiry_date)
    VALUES
      (dog5_id, 'approved', now() - interval '110 days', now() - interval '115 days', now() + interval '1 year', now() + interval '1 year')
    ON CONFLICT DO NOTHING;
    
    -- 犬の出会い記録を作成
    INSERT INTO dog_encounters (dog1_id, dog2_id, park_id, encounter_date, created_at)
    VALUES
      (LEAST(dog1_id, dog3_id), GREATEST(dog1_id, dog3_id), sample_park_id, current_date - interval '10 days', now() - interval '10 days'),
      (LEAST(dog1_id, dog4_id), GREATEST(dog1_id, dog4_id), sample_park_id, current_date - interval '7 days', now() - interval '7 days'),
      (LEAST(dog2_id, dog3_id), GREATEST(dog2_id, dog3_id), sample_park_id, current_date - interval '5 days', now() - interval '5 days')
    ON CONFLICT DO NOTHING;
    
    -- 友達関係を作成
    INSERT INTO friendships (user1_id, user2_id, created_at)
    SELECT 
      LEAST(dog1.owner_id, dog3.owner_id), 
      GREATEST(dog1.owner_id, dog3.owner_id), 
      now() - interval '9 days'
    FROM dogs dog1, dogs dog3
    WHERE dog1.id = dog1_id AND dog3.id = dog3_id
    ON CONFLICT DO NOTHING;
    
    -- 友達申請を作成
    INSERT INTO friend_requests (requester_id, requested_id, status, message, created_at)
    SELECT 
      dog4.owner_id, 
      dog1.owner_id, 
      'pending', 
      'ドッグランで会いましたね！友達になりましょう', 
      now() - interval '6 days'
    FROM dogs dog1, dogs dog4
    WHERE dog1.id = dog1_id AND dog4.id = dog4_id
    ON CONFLICT DO NOTHING;
    
    -- ブラックリストを作成
    INSERT INTO dog_blacklist (user_id, dog_id, reason, notify_when_nearby, created_at)
    SELECT 
      dog1.owner_id, 
      dog5.id, 
      'うちの子と相性が悪いようです', 
      true, 
      now() - interval '3 days'
    FROM dogs dog1, dogs dog5
    WHERE dog1.id = dog1_id AND dog5.id = dog5_id
    ON CONFLICT DO NOTHING;
    
    -- 通知を作成
    INSERT INTO notifications (user_id, type, title, message, data, read, created_at)
    SELECT 
      dog1.owner_id, 
      'friend_at_park', 
      '友達がドッグランにいます', 
      '田中さくらさんが代々木ドッグパークにいます', 
      jsonb_build_object('friend_id', dog3.owner_id, 'park_id', sample_park_id), 
      false, 
      now() - interval '2 days'
    FROM dogs dog1, dogs dog3
    WHERE dog1.id = dog1_id AND dog3.id = dog3_id
    ON CONFLICT DO NOTHING;
    
    INSERT INTO notifications (user_id, type, title, message, data, read, created_at)
    SELECT 
      dog1.owner_id, 
      'friend_request', 
      '新しい友達申請', 
      '佐藤健太さんから友達申請が届きました', 
      jsonb_build_object('requester_id', dog4.owner_id), 
      false, 
      now() - interval '1 day'
    FROM dogs dog1, dogs dog4
    WHERE dog1.id = dog1_id AND dog4.id = dog4_id
    ON CONFLICT DO NOTHING;
    
    INSERT INTO notifications (user_id, type, title, message, data, read, created_at)
    SELECT 
      dog1.owner_id, 
      'blacklisted_dog_nearby', 
      '注意: ブラックリスト登録犬が近くにいます', 
      'レオちゃんが代々木ドッグパークにいます', 
      jsonb_build_object('dog_id', dog5.id, 'park_id', sample_park_id), 
      false, 
      now() - interval '12 hours'
    FROM dogs dog1, dogs dog5
    WHERE dog1.id = dog1_id AND dog5.id = dog5_id
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- サンプルデータ生成関数を実行
SELECT create_community_samples();

-- 関数を削除
DROP FUNCTION create_community_samples();