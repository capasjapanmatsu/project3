-- 画像付きサンプルレビューデータを追加

DO $$
DECLARE
  park_record RECORD;
  review_record RECORD;
  sample_review_images JSONB;
  sample_images_array TEXT[];
  image_url TEXT;
  review_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== 画像付きレビューサンプルデータ追加開始 ===';

  -- サンプル画像URLの配列（実際のドッグランや犬の画像）
  sample_images_array := ARRAY[
    'https://images.unsplash.com/photo-1587300003388-59208cc962cb',
    'https://images.unsplash.com/photo-1583337130417-3346a1be7dee',
    'https://images.unsplash.com/photo-1601758228041-f3b2795255f1',
    'https://images.unsplash.com/photo-1548199973-03cce0bbc87b',
    'https://images.unsplash.com/photo-1529429617124-95b109e86bb8',
    'https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993',
    'https://images.unsplash.com/photo-1551717743-49959800b1f6',
    'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6',
    'https://images.unsplash.com/photo-1477884213360-7e9d7dcc1e48',
    'https://images.unsplash.com/photo-1518717758536-85ae29035b6d'
  ];

  -- 承認済みのドッグランを取得
  FOR park_record IN
    SELECT id, name FROM dog_parks WHERE status = 'approved' LIMIT 8
  LOOP
    RAISE NOTICE 'ドッグラン "%s" に画像付きレビューを追加中...', park_record.name;

    -- 新しい画像付きレビューデータを作成
    INSERT INTO profiles (id, user_type, name, postal_code, address, phone_number, email)
    VALUES 
      (gen_random_uuid(), 'user', '山田花子', '150-0001', '東京都渋谷区神宮前1-1-1', '090-1234-5678', 'yamada@example.com'),
      (gen_random_uuid(), 'user', '鈴木太郎', '160-0023', '東京都新宿区西新宿2-8-1', '080-9876-5432', 'suzuki@example.com'),
      (gen_random_uuid(), 'user', '佐藤美咲', '140-0002', '東京都品川区東品川1-2-3', '070-5555-1234', 'sato@example.com')
    ON CONFLICT (email) DO NOTHING;

    -- 犬のデータを作成
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, gender, image_url)
    SELECT 
      gen_random_uuid(),
      p.id,
      CASE 
        WHEN p.name = '山田花子' THEN 'ちび'
        WHEN p.name = '鈴木太郎' THEN 'マックス'
        WHEN p.name = '佐藤美咲' THEN 'ルナ'
      END,
      CASE 
        WHEN p.name = '山田花子' THEN 'チワワ'
        WHEN p.name = '鈴木太郎' THEN 'ラブラドール'
        WHEN p.name = '佐藤美咲' THEN 'ミニチュアダックスフンド'
      END,
      '2020-03-15'::date,
      CASE 
        WHEN p.name = '山田花子' THEN 'メス'
        WHEN p.name = '鈴木太郎' THEN 'オス'
        WHEN p.name = '佐藤美咲' THEN 'メス'
      END,
      CASE 
        WHEN p.name = '山田花子' THEN 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e'
        WHEN p.name = '鈴木太郎' THEN 'https://images.unsplash.com/photo-1552053831-71594a27632d'
        WHEN p.name = '佐藤美咲' THEN 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d'
      END
    FROM profiles p 
    WHERE p.name IN ('山田花子', '鈴木太郎', '佐藤美咲')
    ON CONFLICT DO NOTHING;

    -- ワクチン証明書の作成
    INSERT INTO vaccine_certifications (
      dog_id,
      rabies_vaccine_image,
      combo_vaccine_image,
      status,
      approved_at,
      rabies_expiry_date,
      combo_expiry_date
    )
    SELECT 
      d.id,
      'sample_rabies_cert.jpg',
      'sample_combo_cert.jpg',
      'approved',
      now(),
      (now() + interval '1 year')::date,
      (now() + interval '1 year')::date
    FROM dogs d
    JOIN profiles p ON d.owner_id = p.id
    WHERE p.name IN ('山田花子', '鈴木太郎', '佐藤美咲')
    ON CONFLICT (dog_id) DO NOTHING;

    -- 予約データを作成
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
    SELECT 
      park_record.id,
      p.id,
      d.id,
      (current_date - interval '30 days')::date,
      '10:00',
      2,
      'confirmed',
      800,
      'IMG' || EXTRACT(epoch FROM now())::text,
      'regular'
    FROM profiles p
    JOIN dogs d ON p.id = d.owner_id
    WHERE p.name IN ('山田花子', '鈴木太郎', '佐藤美咲')
    ON CONFLICT DO NOTHING;

    -- 画像付きレビューを作成
    INSERT INTO dog_park_reviews (
      id,
      park_id,
      user_id,
      dog_id,
      rating,
      review_text,
      visit_date,
      main_image_url,
      review_images,
      created_at,
      updated_at
    )
    SELECT 
      gen_random_uuid(),
      park_record.id,
      p.id,
      d.id,
      CASE 
        WHEN p.name = '山田花子' THEN 5
        WHEN p.name = '鈴木太郎' THEN 4
        WHEN p.name = '佐藤美咲' THEN 5
      END,
      CASE 
        WHEN p.name = '山田花子' THEN 'とても素晴らしいドッグランでした！設備も清潔で、うちのちびちゃんも大喜びでした。写真の通り、広いスペースで安全に遊ばせることができました。'
        WHEN p.name = '鈴木太郎' THEN 'マックスが初めて他の犬たちと楽しく遊べました。大型犬エリアがあるのが良かったです。施設の雰囲気も写真で確認できてとても良い場所でした。'
        WHEN p.name = '佐藤美咲' THEN 'ルナがとても楽しそうに遊んでいました。小型犬専用エリアがあるので安心です。綺麗な施設で写真映えもします！'
      END,
      (current_date - interval '29 days')::date,
      sample_images_array[((EXTRACT(epoch FROM now())::integer + p.id::text::integer) % array_length(sample_images_array, 1)) + 1],
      jsonb_build_array(
        jsonb_build_object(
          'url', sample_images_array[((EXTRACT(epoch FROM now())::integer + p.id::text::integer) % array_length(sample_images_array, 1)) + 1],
          'caption', '施設の全体の様子'
        ),
        jsonb_build_object(
          'url', sample_images_array[((EXTRACT(epoch FROM now())::integer + p.id::text::integer + 1) % array_length(sample_images_array, 1)) + 1],
          'caption', 'ワンちゃんが遊んでいる様子'
        )
      ),
      (current_date - interval '28 days')::timestamp,
      (current_date - interval '28 days')::timestamp
    FROM profiles p
    JOIN dogs d ON p.id = d.owner_id
    WHERE p.name IN ('山田花子', '鈴木太郎', '佐藤美咲')
    ON CONFLICT (park_id, user_id) DO NOTHING;

    review_count := review_count + 3;
    RAISE NOTICE '✓ ドッグラン "%s" に3件の画像付きレビューを追加', park_record.name;
  END LOOP;

  -- 追加の高評価レビューをいくつかのパークに追加
  FOR park_record IN
    SELECT id, name FROM dog_parks WHERE status = 'approved' LIMIT 3
  LOOP
    -- 新しいユーザーとレビューを追加
    INSERT INTO profiles (id, user_type, name, postal_code, address, phone_number, email)
    VALUES 
      (gen_random_uuid(), 'user', '田中一郎', '107-0052', '東京都港区赤坂1-1-1', '090-7777-8888', 'tanaka' || park_record.id::text || '@example.com')
    ON CONFLICT (email) DO NOTHING;

    INSERT INTO dogs (id, owner_id, name, breed, birth_date, gender, image_url)
    SELECT 
      gen_random_uuid(),
      p.id,
      'ハッピー',
      '柴犬',
      '2019-08-20'::date,
      'オス',
      'https://images.unsplash.com/photo-1544717297-fa95b6ee9643'
    FROM profiles p 
    WHERE p.name = '田中一郎' AND p.email = 'tanaka' || park_record.id::text || '@example.com'
    ON CONFLICT DO NOTHING;

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
    SELECT 
      d.id,
      'happy_rabies_cert.jpg',
      'happy_combo_cert.jpg',
      'approved',
      now(),
      (now() + interval '1 year')::date,
      (now() + interval '1 year')::date
    FROM dogs d
    JOIN profiles p ON d.owner_id = p.id
    WHERE p.name = '田中一郎' AND p.email = 'tanaka' || park_record.id::text || '@example.com'
    ON CONFLICT (dog_id) DO NOTHING;

    -- 予約
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
    SELECT 
      park_record.id,
      p.id,
      d.id,
      (current_date - interval '15 days')::date,
      '14:00',
      3,
      'confirmed',
      800,
      'HAPPY' || EXTRACT(epoch FROM now())::text,
      'regular'
    FROM profiles p
    JOIN dogs d ON p.id = d.owner_id
    WHERE p.name = '田中一郎' AND p.email = 'tanaka' || park_record.id::text || '@example.com'
    ON CONFLICT DO NOTHING;

    -- 高評価の画像付きレビュー
    INSERT INTO dog_park_reviews (
      id,
      park_id,
      user_id,
      dog_id,
      rating,
      review_text,
      visit_date,
      main_image_url,
      review_images,
      created_at,
      updated_at
    )
    SELECT 
      gen_random_uuid(),
      park_record.id,
      p.id,
      d.id,
      5,
      'ハッピーがとても気に入っている場所です！清潔で安全、そして他のワンちゃんたちとも仲良く遊べます。写真を見ていただければ分かりますが、設備も充実していて飼い主も安心できます。また必ず来ます！',
      (current_date - interval '14 days')::date,
      sample_images_array[((EXTRACT(epoch FROM now())::integer + park_record.id::text::integer) % array_length(sample_images_array, 1)) + 1],
      jsonb_build_array(
        jsonb_build_object(
          'url', sample_images_array[((EXTRACT(epoch FROM now())::integer + park_record.id::text::integer) % array_length(sample_images_array, 1)) + 1],
          'caption', 'ドッグランの入口付近'
        ),
        jsonb_build_object(
          'url', sample_images_array[((EXTRACT(epoch FROM now())::integer + park_record.id::text::integer + 2) % array_length(sample_images_array, 1)) + 1],
          'caption', 'ハッピーが楽しく遊んでいる様子'
        ),
        jsonb_build_object(
          'url', sample_images_array[((EXTRACT(epoch FROM now())::integer + park_record.id::text::integer + 3) % array_length(sample_images_array, 1)) + 1],
          'caption', '休憩エリアの様子'
        )
      ),
      (current_date - interval '13 days')::timestamp,
      (current_date - interval '13 days')::timestamp
    FROM profiles p
    JOIN dogs d ON p.id = d.owner_id
    WHERE p.name = '田中一郎' AND p.email = 'tanaka' || park_record.id::text || '@example.com'
    ON CONFLICT (park_id, user_id) DO NOTHING;

    review_count := review_count + 1;
  END LOOP;

  RAISE NOTICE '=== 画像付きレビューデータ追加完了 ===';
  RAISE NOTICE '総レビュー数: %件', review_count;
  RAISE NOTICE '✓ 高画質な施設画像付きレビュー';
  RAISE NOTICE '✓ 複数画像での詳細な体験記録';
  RAISE NOTICE '✓ リアルなユーザー体験談';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ エラーが発生しました: %', SQLERRM;
END $$; 