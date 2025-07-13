-- 既存のレビューテーブルに画像カラムを追加（存在しない場合）
ALTER TABLE dog_park_reviews 
ADD COLUMN IF NOT EXISTS review_images JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS main_image_url TEXT DEFAULT NULL;

-- サンプル画像付きレビューを追加
DO $$
DECLARE
  park_record RECORD;
  sample_image_urls TEXT[] := ARRAY[
    'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400',
    'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400',
    'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400',
    'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400',
    'https://images.unsplash.com/photo-1529429617124-95b109e86bb8?w=400'
  ];
BEGIN
  -- 既存のレビューに画像を追加
  UPDATE dog_park_reviews 
  SET 
    main_image_url = sample_image_urls[1 + (ABS(HASHTEXT(id::text)) % array_length(sample_image_urls, 1))],
    review_images = jsonb_build_array(
      jsonb_build_object(
        'url', sample_image_urls[1 + (ABS(HASHTEXT(id::text)) % array_length(sample_image_urls, 1))],
        'caption', '施設の様子'
      ),
      jsonb_build_object(
        'url', sample_image_urls[1 + ((ABS(HASHTEXT(id::text)) + 1) % array_length(sample_image_urls, 1))],
        'caption', 'ワンちゃんが遊んでいる様子'
      )
    )
  WHERE main_image_url IS NULL 
    AND rating >= 4; -- 4つ星以上のレビューに画像を追加

  RAISE NOTICE '既存のレビューに画像を追加しました';
END $$; 