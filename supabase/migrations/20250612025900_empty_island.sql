/*
  # ドッグラン利用履歴のサンプルデータ

  1. 新しいデータ
    - 青空ドッグパーク（サンプルドッグパーク）
    - 複数のユーザーと犬のサンプルデータ
    - 同じ日に同じドッグパークを利用した予約データ
    - 犬の出会い記録
    - 友達関係と友達申請
    - ブラックリスト登録
    - 関連する通知
*/

-- サンプルデータ生成関数
CREATE OR REPLACE FUNCTION create_dogpark_history_samples()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- ドッグパークID
  sample_park_id uuid;
  -- ユーザーID変数
  current_user_id uuid;
  user1_id uuid;
  user2_id uuid;
  user3_id uuid;
  user4_id uuid;
  -- 犬のID変数
  current_user_dog_id uuid;
  dog1_id uuid;
  dog2_id uuid;
  dog3_id uuid;
  dog4_id uuid;
  -- 予約日
  today date := current_date;
  yesterday date := current_date - interval '1 day';
  last_week date := current_date - interval '7 days';
  last_month date := current_date - interval '30 days';
  two_months_ago date := current_date - interval '60 days';
  three_months_ago date := current_date - interval '90 days';
BEGIN
  -- 現在のユーザーIDを取得
  SELECT auth.uid() INTO current_user_id;
  
  -- ユーザーが存在する場合
  IF current_user_id IS NOT NULL THEN
    -- 既存のドッグパークを取得
    SELECT id INTO sample_park_id FROM dog_parks LIMIT 1;
    
    -- ドッグパークがなければ作成
    IF sample_park_id IS NULL THEN
      sample_park_id := gen_random_uuid();
      INSERT INTO dog_parks (id, owner_id, name, description, address, price, status, facilities, max_capacity)
      VALUES
        (sample_park_id, current_user_id, '青空ドッグパーク', '広々とした空間で愛犬と楽しい時間を過ごせます', '東京都新宿区西新宿1-1-1', 800, 'approved', 
         '{"parking": true, "shower": true, "restroom": true, "agility": true, "rest_area": true, "water_station": true}', 20)
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- 現在のユーザーの犬を取得
    SELECT id INTO current_user_dog_id FROM dogs WHERE owner_id = current_user_id LIMIT 1;
    
    -- 現在のユーザーの犬がなければ作成
    IF current_user_dog_id IS NULL THEN
      INSERT INTO dogs (owner_id, name, breed, birth_date, gender, created_at, image_url)
      VALUES
        (current_user_id, 'モカ', 'トイプードル', '2022-03-15', 'メス', now() - interval '30 days', 'https://images.pexels.com/photos/2023384/pexels-photo-2023384.jpeg')
      RETURNING id INTO current_user_dog_id;
      
      -- ワクチン証明書を作成
      INSERT INTO vaccine_certifications (dog_id, status, approved_at, created_at, rabies_expiry_date, combo_expiry_date)
      VALUES
        (current_user_dog_id, 'approved', now() - interval '25 days', now() - interval '30 days', now() + interval '1 year', now() + interval '1 year')
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- サンプルユーザー1を作成
    user1_id := gen_random_uuid();
    INSERT INTO profiles (id, user_type, name, created_at)
    VALUES
      (user1_id, 'user', '山田花子', now() - interval '90 days')
    ON CONFLICT DO NOTHING;
    
    -- サンプルユーザー1の犬を作成
    dog1_id := gen_random_uuid();
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, gender, created_at, image_url)
    VALUES
      (dog1_id, user1_id, 'マロン', 'ポメラニアン', '2020-12-05', 'メス', now() - interval '85 days', 'https://images.pexels.com/photos/2607544/pexels-photo-2607544.jpeg')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO vaccine_certifications (dog_id, status, approved_at, created_at, rabies_expiry_date, combo_expiry_date)
    VALUES
      (dog1_id, 'approved', now() - interval '80 days', now() - interval '85 days', now() + interval '1 year', now() + interval '1 year')
    ON CONFLICT DO NOTHING;
    
    -- サンプルユーザー2を作成
    user2_id := gen_random_uuid();
    INSERT INTO profiles (id, user_type, name, created_at)
    VALUES
      (user2_id, 'user', '佐藤健太', now() - interval '45 days')
    ON CONFLICT DO NOTHING;
    
    -- サンプルユーザー2の犬を作成
    dog2_id := gen_random_uuid();
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, gender, created_at, image_url)
    VALUES
      (dog2_id, user2_id, 'ココ', '柴犬', '2021-08-20', 'メス', now() - interval '40 days', 'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO vaccine_certifications (dog_id, status, approved_at, created_at, rabies_expiry_date, combo_expiry_date)
    VALUES
      (dog2_id, 'approved', now() - interval '35 days', now() - interval '40 days', now() + interval '1 year', now() + interval '1 year')
    ON CONFLICT DO NOTHING;
    
    -- サンプルユーザー3を作成
    user3_id := gen_random_uuid();
    INSERT INTO profiles (id, user_type, name, created_at)
    VALUES
      (user3_id, 'user', '鈴木一郎', now() - interval '120 days')
    ON CONFLICT DO NOTHING;
    
    -- サンプルユーザー3の犬を作成
    dog3_id := gen_random_uuid();
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, gender, created_at, image_url)
    VALUES
      (dog3_id, user3_id, 'レオ', 'ラブラドールレトリバー', '2020-04-15', 'オス', now() - interval '115 days', 'https://images.pexels.com/photos/1490908/pexels-photo-1490908.jpeg')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO vaccine_certifications (dog_id, status, approved_at, created_at, rabies_expiry_date, combo_expiry_date)
    VALUES
      (dog3_id, 'approved', now() - interval '110 days', now() - interval '115 days', now() + interval '1 year', now() + interval '1 year')
    ON CONFLICT DO NOTHING;
    
    -- サンプルユーザー4を作成
    user4_id := gen_random_uuid();
    INSERT INTO profiles (id, user_type, name, created_at)
    VALUES
      (user4_id, 'user', '高橋美咲', now() - interval '60 days')
    ON CONFLICT DO NOTHING;
    
    -- サンプルユーザー4の犬を作成
    dog4_id := gen_random_uuid();
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, gender, created_at, image_url)
    VALUES
      (dog4_id, user4_id, 'ハナ', 'ミニチュアダックスフンド', '2021-10-10', 'メス', now() - interval '55 days', 'https://images.pexels.com/photos/1139794/pexels-photo-1139794.jpeg')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO vaccine_certifications (dog_id, status, approved_at, created_at, rabies_expiry_date, combo_expiry_date)
    VALUES
      (dog4_id, 'approved', now() - interval '50 days', now() - interval '55 days', now() + interval '1 year', now() + interval '1 year')
    ON CONFLICT DO NOTHING;
    
    -- 過去の予約履歴を作成（現在のユーザー用）
    INSERT INTO reservations (user_id, dog_id, park_id, date, start_time, duration, status, total_amount, reservation_type)
    VALUES
      -- 今日の予約
      (current_user_id, current_user_dog_id, sample_park_id, today, '13:00', 2, 'confirmed', 800, 'regular'),
      -- 昨日の予約
      (current_user_id, current_user_dog_id, sample_park_id, yesterday, '14:00', 2, 'confirmed', 800, 'regular'),
      -- 先週の予約
      (current_user_id, current_user_dog_id, sample_park_id, last_week, '10:00', 2, 'confirmed', 800, 'regular'),
      -- 先月の予約（プライベートブース）
      (current_user_id, current_user_dog_id, sample_park_id, last_month, '15:00', 2, 'confirmed', 5000, 'private_booth'),
      -- 2ヶ月前の予約
      (current_user_id, current_user_dog_id, sample_park_id, two_months_ago, '16:00', 2, 'confirmed', 800, 'regular'),
      -- 3ヶ月前の予約（施設貸し切り）
      (current_user_id, current_user_dog_id, sample_park_id, three_months_ago, '12:00', 2, 'confirmed', 15000, 'whole_facility')
    ON CONFLICT DO NOTHING;
    
    -- 他のユーザーの予約（同じ日に同じドッグパークを利用）
    INSERT INTO reservations (user_id, dog_id, park_id, date, start_time, duration, status, total_amount, reservation_type)
    VALUES
      -- 昨日の予約（他のユーザー）
      (user1_id, dog1_id, sample_park_id, yesterday, '14:00', 2, 'confirmed', 800, 'regular'),
      (user2_id, dog2_id, sample_park_id, yesterday, '15:00', 2, 'confirmed', 800, 'regular'),
      (user4_id, dog4_id, sample_park_id, yesterday, '13:30', 2, 'confirmed', 800, 'regular'),
      -- 先週の予約（他のユーザー）
      (user3_id, dog3_id, sample_park_id, last_week, '11:00', 2, 'confirmed', 800, 'regular')
    ON CONFLICT DO NOTHING;
    
    -- 犬の出会い記録を作成（同じ日に同じドッグパークを利用した犬同士）
    INSERT INTO dog_encounters (dog1_id, dog2_id, park_id, encounter_date, created_at)
    VALUES
      -- 昨日の出会い
      (LEAST(current_user_dog_id, dog1_id), GREATEST(current_user_dog_id, dog1_id), sample_park_id, yesterday, now() - interval '1 day'),
      (LEAST(current_user_dog_id, dog2_id), GREATEST(current_user_dog_id, dog2_id), sample_park_id, yesterday, now() - interval '1 day'),
      (LEAST(current_user_dog_id, dog4_id), GREATEST(current_user_dog_id, dog4_id), sample_park_id, yesterday, now() - interval '1 day'),
      -- 先週の出会い
      (LEAST(current_user_dog_id, dog3_id), GREATEST(current_user_dog_id, dog3_id), sample_park_id, last_week, now() - interval '7 days')
    ON CONFLICT DO NOTHING;
    
    -- 友達関係を作成
    INSERT INTO friendships (user1_id, user2_id, created_at)
    VALUES
      (LEAST(current_user_id, user1_id), GREATEST(current_user_id, user1_id), now() - interval '1 day')
    ON CONFLICT DO NOTHING;
    
    -- 友達申請を作成
    INSERT INTO friend_requests (requester_id, requested_id, status, message, created_at)
    VALUES
      (user2_id, current_user_id, 'pending', 'ドッグランで会いましたね！友達になりましょう', now() - interval '1 day')
    ON CONFLICT DO NOTHING;
    
    -- ブラックリストを作成
    INSERT INTO dog_blacklist (user_id, dog_id, reason, notify_when_nearby, created_at)
    VALUES
      (current_user_id, dog3_id, 'うちの子と相性が悪いようです', true, now() - interval '1 day')
    ON CONFLICT DO NOTHING;
    
    -- 通知を作成
    INSERT INTO notifications (user_id, type, title, message, data, read, created_at)
    VALUES
      (current_user_id, 'friend_at_park', '友達がドッグランにいます', 
       '山田花子さんが青空ドッグパークにいます', 
       jsonb_build_object('friend_id', user1_id, 'park_id', sample_park_id), 
       false, now() - interval '2 hours'),
      (current_user_id, 'friend_request', '新しい友達申請', 
       '佐藤健太さんから友達申請が届きました', 
       jsonb_build_object('requester_id', user2_id), 
       false, now() - interval '1 hour'),
      (current_user_id, 'blacklisted_dog_nearby', '注意: ブラックリスト登録犬が近くにいます', 
       'レオちゃんが青空ドッグパークにいます', 
       jsonb_build_object('dog_id', dog3_id, 'park_id', sample_park_id), 
       false, now() - interval '30 minutes')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- サンプルデータ生成関数を実行
SELECT create_dogpark_history_samples();

-- 関数を削除
DROP FUNCTION create_dogpark_history_samples();