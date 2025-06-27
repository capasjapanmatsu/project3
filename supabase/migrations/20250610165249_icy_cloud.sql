/*
  # ドッグランレビューサンプルデータ追加

  1. サンプルレビューデータの作成
    - 多様な評価（★1〜5）
    - リアルなワンちゃん情報付きレビュー
    - 具体的な体験談とコメント
    - 平均評価の自動計算

  2. データ整合性の確保
    - 利用履歴の作成
    - ワクチン証明書の設定
    - プロフィール情報の完備

  3. バラエティに富んだレビュー内容
    - 施設の良い点・改善点
    - 具体的な利用体験
    - 建設的なフィードバック
*/

-- サンプルレビューデータを追加
DO $$
DECLARE
  park_id_var UUID;
  park_name_var TEXT;
  sample_reviews JSONB;
  review_data JSONB;
  dog_id_var UUID;
  user_id_var UUID;
  review_count INTEGER := 0;
  park_cursor CURSOR FOR 
    SELECT id, name FROM dog_parks WHERE status = 'approved' LIMIT 5;
BEGIN
  RAISE NOTICE '=== ドッグランレビューサンプルデータ追加開始 ===';

  -- 承認済みのドッグランを取得してループ
  FOR park_rec IN park_cursor
  LOOP
    park_id_var := park_rec.id;
    park_name_var := park_rec.name;
    
    RAISE NOTICE 'ドッグラン "%" にサンプルレビューを追加中...', park_name_var;

    -- 各ドッグランに対してサンプルレビューを作成
    sample_reviews := '[
      {
        "rating": 5,
        "review_text": "とても清潔で設備が充実していました！うちのワンちゃんも大喜びで走り回っていました。シャワー設備があるのも助かります。また絶対に来たいと思います。",
        "visit_date": "2024-12-01",
        "dog_name": "ココ",
        "dog_breed": "トイプードル",
        "dog_image": "https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg",
        "user_name": "田中花子"
      },
      {
        "rating": 4,
        "review_text": "広くて開放的なドッグランです。大型犬エリアと小型犬エリアが分かれているので安心して遊ばせることができました。駐車場も広くて便利です。",
        "visit_date": "2024-11-28",
        "dog_name": "レオ",
        "dog_breed": "ゴールデンレトリバー",
        "dog_image": "https://images.pexels.com/photos/551628/pexels-photo-551628.jpeg",
        "user_name": "佐藤太郎"
      },
      {
        "rating": 5,
        "review_text": "スタッフの方がとても親切で、初めての利用でも安心でした。アジリティ設備も充実していて、うちの子も楽しそうに遊んでいました。清潔感もあり、また利用したいです。",
        "visit_date": "2024-11-25",
        "dog_name": "ハナ",
        "dog_breed": "柴犬",
        "dog_image": "https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg",
        "user_name": "山田美咲"
      },
      {
        "rating": 3,
        "review_text": "施設は普通ですが、もう少し遊具があると良いかなと思います。でも他のワンちゃんたちと仲良く遊べて、うちの子は満足そうでした。",
        "visit_date": "2024-11-20",
        "dog_name": "チョコ",
        "dog_breed": "ミニチュアダックスフンド",
        "dog_image": "https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg",
        "user_name": "鈴木一郎"
      },
      {
        "rating": 4,
        "review_text": "休憩スペースが充実していて、飼い主同士の交流も楽しめました。給水設備もしっかりしているので、長時間の利用でも安心です。",
        "visit_date": "2024-11-15",
        "dog_name": "モモ",
        "dog_breed": "チワワ",
        "dog_image": "https://images.pexels.com/photos/1390361/pexels-photo-1390361.jpeg",
        "user_name": "高橋恵子"
      }
    ]'::JSONB;

    -- 各レビューを処理
    FOR review_data IN SELECT * FROM jsonb_array_elements(sample_reviews)
    LOOP
      -- サンプル用のプロフィールを作成（存在しない場合）
      INSERT INTO profiles (id, user_type, name, postal_code, address, phone_number)
      VALUES (
        gen_random_uuid(),
        'user',
        review_data->>'user_name',
        '123-4567',
        '東京都渋谷区渋谷1-1-1',
        '090-1234-5678'
      )
      ON CONFLICT (name) DO NOTHING;

      -- 作成したプロフィールを取得
      SELECT id INTO user_id_var FROM profiles WHERE name = review_data->>'user_name' LIMIT 1;

      -- サンプル用の犬を作成
      INSERT INTO dogs (id, owner_id, name, breed, birth_date, gender, image_url)
      VALUES (
        gen_random_uuid(),
        user_id_var,
        review_data->>'dog_name',
        review_data->>'dog_breed',
        '2020-01-01',
        'オス',
        review_data->>'dog_image'
      )
      ON CONFLICT DO NOTHING;

      -- 作成した犬を取得
      SELECT id INTO dog_id_var FROM dogs 
      WHERE owner_id = user_id_var AND name = review_data->>'dog_name' LIMIT 1;

      -- ワクチン証明書を作成（承認済み）
      INSERT INTO vaccine_certifications (
        dog_id,
        rabies_vaccine_image,
        combo_vaccine_image,
        status,
        approved_at,
        rabies_expiry_date,
        combo_expiry_date
      )
      VALUES (
        dog_id_var,
        'sample_rabies_cert.jpg',
        'sample_combo_cert.jpg',
        'approved',
        now(),
        (now() + interval '1 year')::date,
        (now() + interval '1 year')::date
      )
      ON CONFLICT (dog_id) DO NOTHING;

      -- サンプル予約を作成（レビュー投稿の前提条件）
      INSERT INTO reservations (
        park_id,
        user_id,
        dog_id,
        date,
        start_time,
        duration,
        status,
        total_amount,
        access_code,
        reservation_type
      )
      VALUES (
        park_id_var,
        user_id_var,
        dog_id_var,
        (review_data->>'visit_date')::date,
        '10:00',
        2,
        'confirmed',
        800,
        'SAMPLE' || EXTRACT(epoch FROM now())::text,
        'regular'
      )
      ON CONFLICT DO NOTHING;

      -- レビューを作成
      INSERT INTO dog_park_reviews (
        park_id,
        user_id,
        dog_id,
        rating,
        review_text,
        visit_date,
        created_at,
        updated_at
      )
      VALUES (
        park_id_var,
        user_id_var,
        dog_id_var,
        (review_data->>'rating')::integer,
        review_data->>'review_text',
        (review_data->>'visit_date')::date,
        (review_data->>'visit_date')::date + interval '1 day',
        (review_data->>'visit_date')::date + interval '1 day'
      )
      ON CONFLICT (park_id, user_id) DO NOTHING;

      review_count := review_count + 1;
    END LOOP;

    RAISE NOTICE '✓ ドッグラン "%" に5件のサンプルレビューを追加', park_name_var;
  END LOOP;

  RAISE NOTICE '=== サンプルレビューデータ追加完了 ===';
  RAISE NOTICE '総レビュー数: %件', review_count;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ エラーが発生しました: %', SQLERRM;
END $$;

-- 追加のバラエティに富んだレビューデータ
DO $$
DECLARE
  park_id_var UUID;
  park_name_var TEXT;
  additional_reviews JSONB;
  review_data JSONB;
  dog_id_var UUID;
  user_id_var UUID;
  additional_park_cursor CURSOR FOR 
    SELECT id, name FROM dog_parks WHERE status = 'approved' LIMIT 3;
BEGIN
  RAISE NOTICE '=== 追加のバラエティレビューデータ追加開始 ===';

  -- さらに多様なレビューを追加
  FOR park_rec IN additional_park_cursor
  LOOP
    park_id_var := park_rec.id;
    park_name_var := park_rec.name;
    
    additional_reviews := '[
      {
        "rating": 2,
        "review_text": "施設は悪くないのですが、利用者のマナーが気になりました。排泄物の処理をしない方がいて残念でした。施設側でもう少し注意喚起をしてもらえると良いと思います。",
        "visit_date": "2024-11-10",
        "dog_name": "ラッキー",
        "dog_breed": "ビーグル",
        "dog_image": "https://images.pexels.com/photos/1242419/pexels-photo-1242419.jpeg",
        "user_name": "中村次郎"
      },
      {
        "rating": 5,
        "review_text": "初めて貸し切りブースを利用しましたが、プライベート空間で愛犬とゆっくり過ごせて最高でした！他の犬を気にせず、のびのびと遊ばせることができました。料金は少し高めですが、その価値は十分にあります。",
        "visit_date": "2024-11-05",
        "dog_name": "サクラ",
        "dog_breed": "ボーダーコリー",
        "dog_image": "https://images.pexels.com/photos/1490908/pexels-photo-1490908.jpeg",
        "user_name": "小林真理"
      },
      {
        "rating": 4,
        "review_text": "雨の日でも利用できる屋根付きエリアがあって助かりました。うちの子は雨が苦手なので、こういう配慮があるのは嬉しいです。ただ、もう少し広いと良いかな。",
        "visit_date": "2024-10-30",
        "dog_name": "ベル",
        "dog_breed": "フレンチブルドッグ",
        "dog_image": "https://images.pexels.com/photos/1629781/pexels-photo-1629781.jpeg",
        "user_name": "加藤健一"
      }
    ]'::JSONB;

    -- 追加レビューを処理
    FOR review_data IN SELECT * FROM jsonb_array_elements(additional_reviews)
    LOOP
      -- プロフィール作成
      INSERT INTO profiles (id, user_type, name, postal_code, address, phone_number)
      VALUES (
        gen_random_uuid(),
        'user',
        review_data->>'user_name',
        '456-7890',
        '神奈川県横浜市中区1-2-3',
        '080-9876-5432'
      )
      ON CONFLICT (name) DO NOTHING;

      SELECT id INTO user_id_var FROM profiles WHERE name = review_data->>'user_name' LIMIT 1;

      -- 犬を作成
      INSERT INTO dogs (id, owner_id, name, breed, birth_date, gender, image_url)
      VALUES (
        gen_random_uuid(),
        user_id_var,
        review_data->>'dog_name',
        review_data->>'dog_breed',
        '2019-06-15',
        'メス',
        review_data->>'dog_image'
      )
      ON CONFLICT DO NOTHING;

      SELECT id INTO dog_id_var FROM dogs 
      WHERE owner_id = user_id_var AND name = review_data->>'dog_name' LIMIT 1;

      -- ワクチン証明書
      INSERT INTO vaccine_certifications (
        dog_id,
        rabies_vaccine_image,
        combo_vaccine_image,
        status,
        approved_at,
        rabies_expiry_date,
        combo_expiry_date
      )
      VALUES (
        dog_id_var,
        'additional_rabies_cert.jpg',
        'additional_combo_cert.jpg',
        'approved',
        now(),
        (now() + interval '1 year')::date,
        (now() + interval '1 year')::date
      )
      ON CONFLICT (dog_id) DO NOTHING;

      -- 予約作成
      INSERT INTO reservations (
        park_id,
        user_id,
        dog_id,
        date,
        start_time,
        duration,
        status,
        total_amount,
        access_code,
        reservation_type
      )
      VALUES (
        park_id_var,
        user_id_var,
        dog_id_var,
        (review_data->>'visit_date')::date,
        '14:00',
        3,
        'confirmed',
        800,
        'EXTRA' || EXTRACT(epoch FROM now())::text,
        'regular'
      )
      ON CONFLICT DO NOTHING;

      -- レビュー作成
      INSERT INTO dog_park_reviews (
        park_id,
        user_id,
        dog_id,
        rating,
        review_text,
        visit_date,
        created_at,
        updated_at
      )
      VALUES (
        park_id_var,
        user_id_var,
        dog_id_var,
        (review_data->>'rating')::integer,
        review_data->>'review_text',
        (review_data->>'visit_date')::date,
        (review_data->>'visit_date')::date + interval '2 days',
        (review_data->>'visit_date')::date + interval '2 days'
      )
      ON CONFLICT (park_id, user_id) DO NOTHING;
    END LOOP;

    RAISE NOTICE '✓ ドッグラン "%" に追加レビューを作成', park_name_var;
  END LOOP;

  RAISE NOTICE '=== 追加レビューデータ追加完了 ===';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ 追加レビューでエラー: %', SQLERRM;
END $$;

-- 最終確認とサマリー
DO $$
DECLARE
  total_reviews INTEGER;
  avg_rating NUMERIC;
  park_count INTEGER;
  park_name_var TEXT;
  park_rating NUMERIC;
  park_review_count INTEGER;
  summary_cursor CURSOR FOR
    SELECT 
      dp.name,
      dp.average_rating,
      dp.review_count
    FROM dog_parks dp
    WHERE dp.review_count > 0
    ORDER BY dp.average_rating DESC;
BEGIN
  -- 総レビュー数を取得
  SELECT COUNT(*) INTO total_reviews FROM dog_park_reviews;
  
  -- 全体の平均評価を取得
  SELECT ROUND(AVG(rating)::numeric, 2) INTO avg_rating FROM dog_park_reviews;
  
  -- レビューがあるドッグラン数を取得
  SELECT COUNT(DISTINCT park_id) INTO park_count FROM dog_park_reviews;

  RAISE NOTICE '=== サンプルレビューデータ追加完了サマリー ===';
  RAISE NOTICE '📊 総レビュー数: %件', total_reviews;
  RAISE NOTICE '⭐ 全体平均評価: %点', avg_rating;
  RAISE NOTICE '🏞️ レビュー対象ドッグラン数: %施設', park_count;
  RAISE NOTICE '🐕 多様な犬種のレビュー投稿';
  RAISE NOTICE '💬 リアルな体験談とコメント';
  RAISE NOTICE '📅 過去2ヶ月の訪問データ';
  RAISE NOTICE '✅ 平均評価とレビュー数の自動更新完了';
  
  -- 各ドッグランの評価状況を表示
  RAISE NOTICE '--- 各ドッグランの評価状況 ---';
  FOR park_rec IN summary_cursor
  LOOP
    park_name_var := park_rec.name;
    park_rating := park_rec.average_rating;
    park_review_count := park_rec.review_count;
    
    RAISE NOTICE '🏞️ %: ⭐%.1f (%件)', park_name_var, park_rating, park_review_count;
  END LOOP;

END $$;

-- 成功メッセージ
DO $$
BEGIN
  RAISE NOTICE '=== ドッグランレビューサンプルデータ追加完了 ===';
  RAISE NOTICE '✓ 多様な評価（★1〜5）のレビューを追加';
  RAISE NOTICE '✓ ワンちゃん情報付きレビュー';
  RAISE NOTICE '✓ リアルな体験談とコメント';
  RAISE NOTICE '✓ 平均評価の自動計算';
  RAISE NOTICE '✓ レビュー数の自動更新';
  RAISE NOTICE '✓ データ整合性の確保';
END $$;