/*
  # Fix Second Stage Review RLS Issues
  
  1. Fix dog_park_review_stages RLS policies
  2. Fix admin_notifications RLS policies
  3. Update submit_second_stage_review function permissions
*/

-- dog_park_review_stages テーブルのRLSポリシーを修正
DROP POLICY IF EXISTS "Park owners can view their review stages" ON dog_park_review_stages;
DROP POLICY IF EXISTS "Park owners can insert their review stages" ON dog_park_review_stages;
DROP POLICY IF EXISTS "System can insert review stages" ON dog_park_review_stages;
DROP POLICY IF EXISTS "System can manage review stages" ON dog_park_review_stages;

-- パークオーナーが自分のレビューステージを表示できるポリシー
CREATE POLICY "Park owners can view their review stages" 
  ON dog_park_review_stages
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM dog_parks
    WHERE dog_parks.id = dog_park_review_stages.park_id
    AND dog_parks.owner_id = auth.uid()
  ));

-- システム関数がレビューステージを作成・更新できるポリシー
CREATE POLICY "System can manage review stages" 
  ON dog_park_review_stages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- admin_notifications テーブルのRLSポリシーを修正
DROP POLICY IF EXISTS "Only admins can access admin notifications" ON admin_notifications;
DROP POLICY IF EXISTS "admin_notifications_admin_only" ON admin_notifications;
DROP POLICY IF EXISTS "System can insert admin notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Admins can view admin notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Admins can update admin notifications" ON admin_notifications;

-- 管理者がadmin_notificationsを表示できるポリシー
CREATE POLICY "Admins can view admin notifications"
  ON admin_notifications
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'email' = 'capasjapan@gmail.com') OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );

-- システム関数がadmin_notificationsを作成できるポリシー
CREATE POLICY "System can insert admin notifications"
  ON admin_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 管理者がadmin_notificationsを更新できるポリシー
CREATE POLICY "Admins can update admin notifications"
  ON admin_notifications
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'email' = 'capasjapan@gmail.com') OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  )
  WITH CHECK (
    (auth.jwt() ->> 'email' = 'capasjapan@gmail.com') OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );

-- submit_second_stage_review関数を更新（SECURITY DEFINERで実行）
CREATE OR REPLACE FUNCTION submit_second_stage_review(park_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_park_id UUID;
  v_review_stage_exists BOOLEAN;
  v_park_name TEXT;
BEGIN
  -- パークIDの存在確認
  SELECT id, name INTO v_park_id, v_park_name
  FROM dog_parks
  WHERE id = park_id_param
  AND owner_id = auth.uid()
  AND status = 'first_stage_passed';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '対象のドッグランが見つからないか、第一審査が通過していません';
  END IF;
  
  -- レビューステージが存在するか確認
  SELECT EXISTS(
    SELECT 1 FROM dog_park_review_stages
    WHERE park_id = park_id_param
  ) INTO v_review_stage_exists;
  
  -- ステータスを更新
  UPDATE dog_parks
  SET status = 'second_stage_review',
      updated_at = now()
  WHERE id = park_id_param;
  
  -- 審査ステージを更新または作成
  IF v_review_stage_exists THEN
    -- 既存のレコードを更新
    UPDATE dog_park_review_stages
    SET second_stage_submitted_at = now(),
        updated_at = now()
    WHERE park_id = park_id_param;
  ELSE
    -- 新しいレコードを作成
    INSERT INTO dog_park_review_stages (
      park_id,
      first_stage_passed_at,
      second_stage_submitted_at
    ) VALUES (
      park_id_param,
      now(),
      now()
    );
  END IF;
  
  -- 管理者通知を作成
  INSERT INTO admin_notifications (
    type,
    title,
    message,
    data,
    is_read
  ) VALUES (
    'park_approval',
    'ドッグラン第二審査申請',
    v_park_name || 'の第二審査が申請されました。画像審査を行ってください。',
    jsonb_build_object('park_id', park_id_param),
    false
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Second stage review submission failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 関数の実行権限を設定
GRANT EXECUTE ON FUNCTION submit_second_stage_review(UUID) TO authenticated;

-- コメントを追加
COMMENT ON FUNCTION submit_second_stage_review IS 'ドッグランの第二審査を申請するための関数（RLS対応）'; 