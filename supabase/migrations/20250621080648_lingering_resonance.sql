-- Create or replace the RPC function for submitting second stage review
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
  
  -- Check if all required images are uploaded
  IF NOT EXISTS (
    SELECT 1 FROM dog_park_facility_images
    WHERE park_id = park_id_param
    AND image_type = 'overview'
  ) THEN
    RAISE EXCEPTION 'Required image "overview" is missing';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM dog_park_facility_images
    WHERE park_id = park_id_param
    AND image_type = 'entrance'
  ) THEN
    RAISE EXCEPTION 'Required image "entrance" is missing';
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
  SET status = 'second_stage_review'
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
    SET second_stage_submitted_at = now()
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

-- Add comment to the function
COMMENT ON FUNCTION submit_second_stage_review IS 'ドッグランの第二審査を申請するための関数';