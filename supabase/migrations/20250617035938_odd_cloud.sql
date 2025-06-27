/*
  # Dog Park Review Stages Table

  1. New Tables
    - `dog_park_review_stages` - Tracks the review process stages for dog parks
  2. Security
    - Enable RLS on the table
    - Add policy for park owners to view their review stages
  3. Functions
    - Add function to submit second stage review
    - Add trigger for updating timestamps
*/

-- ドッグラン審査ステージテーブル
CREATE TABLE IF NOT EXISTS dog_park_review_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id UUID NOT NULL REFERENCES dog_parks(id),
  first_stage_passed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  second_stage_submitted_at TIMESTAMPTZ,
  qr_testing_started_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLSの有効化
ALTER TABLE dog_park_review_stages ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの設定（既存のポリシーを確認してから作成）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'dog_park_review_stages' 
    AND policyname = 'Park owners can view their review stages'
  ) THEN
    CREATE POLICY "Park owners can view their review stages" 
      ON dog_park_review_stages
      FOR SELECT
      TO public
      USING (EXISTS (
        SELECT 1 FROM dog_parks
        WHERE dog_parks.id = dog_park_review_stages.park_id
        AND dog_parks.owner_id = auth.uid()
      ));
  END IF;
END
$$;

-- 更新日時を自動更新するトリガー関数（既存の場合は置き換え）
CREATE OR REPLACE FUNCTION update_dog_park_review_stages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーが存在しない場合のみ作成
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_dog_park_review_stages_updated_at'
  ) THEN
    CREATE TRIGGER update_dog_park_review_stages_updated_at
    BEFORE UPDATE ON dog_park_review_stages
    FOR EACH ROW
    EXECUTE FUNCTION update_dog_park_review_stages_updated_at();
  END IF;
END
$$;

-- 第二審査申請関数（常に置き換え）
CREATE OR REPLACE FUNCTION submit_second_stage_review(park_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_park_id UUID;
BEGIN
  -- パークIDの存在確認
  SELECT id INTO v_park_id
  FROM dog_parks
  WHERE id = park_id_param
  AND owner_id = auth.uid()
  AND status = 'first_stage_passed';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '対象のドッグランが見つからないか、第一審査が通過していません';
  END IF;
  
  -- ステータスを更新
  UPDATE dog_parks
  SET status = 'second_stage_review'
  WHERE id = park_id_param;
  
  -- 審査ステージを更新
  UPDATE dog_park_review_stages
  SET second_stage_submitted_at = now()
  WHERE park_id = park_id_param;
  
  -- 管理者通知を作成
  INSERT INTO admin_notifications (
    type,
    title,
    message,
    data
  ) VALUES (
    'park_approval',
    'ドッグラン第二審査申請',
    (SELECT name FROM dog_parks WHERE id = park_id_param) || 'の第二審査が申請されました。画像審査を行ってください。',
    jsonb_build_object('park_id', park_id_param)
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;