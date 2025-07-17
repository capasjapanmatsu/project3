-- データベースの制約を直接修正するSQL

-- 1. 現在の制約を確認
SELECT conname, consrc 
FROM pg_constraint 
JOIN pg_class ON pg_constraint.conrelid = pg_class.oid 
WHERE pg_class.relname = 'dog_parks' AND contype = 'c';

-- 2. 既存の制約を削除
ALTER TABLE dog_parks DROP CONSTRAINT IF EXISTS dog_parks_status_check;

-- 3. 新しい制約を追加（すべてのステータスを含む）
ALTER TABLE dog_parks ADD CONSTRAINT dog_parks_status_check 
  CHECK (status = ANY (ARRAY['pending'::text, 'first_stage_passed'::text, 'second_stage_review'::text, 'qr_testing'::text, 'approved'::text, 'rejected'::text]));

-- 4. 制約が正しく適用されたことを確認
SELECT conname, consrc 
FROM pg_constraint 
JOIN pg_class ON pg_constraint.conrelid = pg_class.oid 
WHERE pg_class.relname = 'dog_parks' AND contype = 'c' AND conname = 'dog_parks_status_check';

-- 5. submit_second_stage_review関数を再作成
CREATE OR REPLACE FUNCTION submit_second_stage_review(park_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_park_status text;
  v_review_stage_id uuid;
  v_missing_images text[];
BEGIN
  -- Get the park owner and status
  SELECT owner_id, status INTO v_owner_id, v_park_status
  FROM dog_parks
  WHERE id = park_id_param;
  
  -- Check if the user is the owner
  IF v_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'You are not the owner of this park';
  END IF;
  
  -- Check if the park is in the correct stage
  IF v_park_status != 'first_stage_passed' THEN
    RAISE EXCEPTION 'Park is not in the correct stage for second stage review';
  END IF;
  
  -- Check if all required images are uploaded (必須画像：overview、entrance、gate、fence)
  v_missing_images := ARRAY[]::text[];
  
  -- Check overview image
  IF NOT EXISTS (
    SELECT 1 FROM dog_park_facility_images
    WHERE park_id = park_id_param
    AND image_type = 'overview'
    AND image_url IS NOT NULL
  ) THEN
    v_missing_images := v_missing_images || 'overview';
  END IF;
  
  -- Check entrance image
  IF NOT EXISTS (
    SELECT 1 FROM dog_park_facility_images
    WHERE park_id = park_id_param
    AND image_type = 'entrance'
    AND image_url IS NOT NULL
  ) THEN
    v_missing_images := v_missing_images || 'entrance';
  END IF;
  
  -- Check gate image
  IF NOT EXISTS (
    SELECT 1 FROM dog_park_facility_images
    WHERE park_id = park_id_param
    AND image_type = 'gate'
    AND image_url IS NOT NULL
  ) THEN
    v_missing_images := v_missing_images || 'gate';
  END IF;
  
  -- Check fence image
  IF NOT EXISTS (
    SELECT 1 FROM dog_park_facility_images
    WHERE park_id = park_id_param
    AND image_type = 'fence'
    AND image_url IS NOT NULL
  ) THEN
    v_missing_images := v_missing_images || 'fence';
  END IF;
  
  -- If there are missing images, throw exception
  IF array_length(v_missing_images, 1) > 0 THEN
    RAISE EXCEPTION 'Required images are missing: %', array_to_string(v_missing_images, ', ');
  END IF;
  
  -- Check if bank account information is set
  IF NOT EXISTS (
    SELECT 1 FROM owner_bank_accounts
    WHERE owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Bank account information is not set';
  END IF;
  
  -- Update park status
  UPDATE dog_parks
  SET status = 'second_stage_review',
      updated_at = now()
  WHERE id = park_id_param;
  
  -- Check if review stage record exists
  SELECT id INTO v_review_stage_id
  FROM dog_park_review_stages
  WHERE park_id = park_id_param;
  
  IF v_review_stage_id IS NULL THEN
    -- Create review stage record
    INSERT INTO dog_park_review_stages (
      park_id,
      first_stage_passed_at,
      second_stage_submitted_at
    ) VALUES (
      park_id_param,
      now(),
      now()
    );
  ELSE
    -- Update review stage record
    UPDATE dog_park_review_stages
    SET second_stage_submitted_at = now(),
        updated_at = now()
    WHERE id = v_review_stage_id;
  END IF;
  
  -- Create notification for admin
  INSERT INTO admin_notifications (
    type,
    title,
    message,
    data,
    is_read
  ) VALUES (
    'park_approval',
    '新しい第二審査申請',
    '新しいドッグランの第二審査申請があります。確認してください。',
    jsonb_build_object('park_id', park_id_param),
    false
  );
  
  RETURN true;
END;
$$;

-- 6. 関数にコメントを追加
COMMENT ON FUNCTION submit_second_stage_review IS 'ドッグランの第二審査を申請するための関数（必須画像：overview、entrance、gate、fence）'; 