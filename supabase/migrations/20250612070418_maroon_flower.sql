/*
  # 管理者用の施設画像承認機能

  1. 新しい関数
    - `get_pending_facility_images` - 承認待ちの施設画像を取得する関数
    - `approve_all_facility_images` - パークの全ての施設画像を承認する関数
    - `move_park_to_qr_testing` - パークをQRコード実証検査段階に進める関数

  2. 管理者ダッシュボード用のビュー
    - `admin_pending_parks_view` - 承認待ちのパーク一覧を表示するビュー
*/

-- 承認待ちの施設画像を取得する関数（管理者用）
CREATE OR REPLACE FUNCTION get_pending_facility_images(park_id_param uuid)
RETURNS TABLE (
  id uuid,
  park_id uuid,
  image_type text,
  image_url text,
  is_approved boolean,
  admin_notes text,
  created_at timestamptz,
  updated_at timestamptz,
  park_name text,
  owner_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 管理者権限チェック
  IF NOT (SELECT (jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text) THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;
  
  RETURN QUERY
  SELECT 
    i.id,
    i.park_id,
    i.image_type,
    i.image_url,
    i.is_approved,
    i.admin_notes,
    i.created_at,
    i.updated_at,
    p.name as park_name,
    o.name as owner_name
  FROM dog_park_facility_images i
  JOIN dog_parks p ON i.park_id = p.id
  JOIN profiles o ON p.owner_id = o.id
  WHERE i.park_id = park_id_param
  ORDER BY i.created_at ASC;
END;
$$;

-- パークの全ての施設画像を承認する関数（管理者用）
CREATE OR REPLACE FUNCTION approve_all_facility_images(park_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 管理者権限チェック
  IF NOT (SELECT (jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text) THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;
  
  UPDATE dog_park_facility_images
  SET is_approved = true,
      updated_at = now()
  WHERE park_id = park_id_param
  AND is_approved IS NULL;
  
  RETURN true;
END;
$$;

-- パークをQRコード実証検査段階に進める関数（管理者用）
CREATE OR REPLACE FUNCTION move_park_to_qr_testing(park_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_review_stage_id uuid;
  v_owner_id uuid;
  v_park_name text;
BEGIN
  -- 管理者権限チェック
  IF NOT (SELECT (jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text) THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;
  
  -- パーク情報を取得
  SELECT owner_id, name INTO v_owner_id, v_park_name
  FROM dog_parks
  WHERE id = park_id_param;
  
  -- 審査ステージの更新
  SELECT id INTO v_review_stage_id
  FROM dog_park_review_stages
  WHERE park_id = park_id_param;
  
  IF v_review_stage_id IS NULL THEN
    RAISE EXCEPTION 'Review stage not found';
  END IF;
  
  UPDATE dog_park_review_stages
  SET qr_testing_started_at = now(),
      updated_at = now()
  WHERE id = v_review_stage_id;
  
  -- パークの状態を更新
  UPDATE dog_parks
  SET status = 'qr_testing',
      updated_at = now()
  WHERE id = park_id_param;
  
  -- オーナーに通知
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    v_owner_id,
    'park_approval',
    'QRコード実証検査のお知らせ',
    v_park_name || 'の第二審査が通過しました。QRコード実証検査の日程調整のためご連絡いたします。',
    jsonb_build_object('park_id', park_id_param)
  );
  
  RETURN true;
END;
$$;

-- 管理者ダッシュボード用のビュー
CREATE OR REPLACE VIEW admin_pending_parks_view AS
SELECT 
  p.id,
  p.name,
  p.address,
  p.status,
  p.created_at,
  o.name as owner_name,
  o.id as owner_id,
  rs.second_stage_submitted_at,
  (
    SELECT COUNT(*)
    FROM dog_park_facility_images i
    WHERE i.park_id = p.id
  ) as total_images,
  (
    SELECT COUNT(*)
    FROM dog_park_facility_images i
    WHERE i.park_id = p.id
    AND i.is_approved IS NULL
  ) as pending_images,
  (
    SELECT COUNT(*)
    FROM dog_park_facility_images i
    WHERE i.park_id = p.id
    AND i.is_approved = true
  ) as approved_images,
  (
    SELECT COUNT(*)
    FROM dog_park_facility_images i
    WHERE i.park_id = p.id
    AND i.is_approved = false
  ) as rejected_images
FROM dog_parks p
JOIN profiles o ON p.owner_id = o.id
LEFT JOIN dog_park_review_stages rs ON p.id = rs.park_id
WHERE p.status IN ('pending', 'first_stage_passed', 'second_stage_review', 'qr_testing')
ORDER BY 
  CASE 
    WHEN p.status = 'second_stage_review' THEN 1
    WHEN p.status = 'qr_testing' THEN 2
    WHEN p.status = 'first_stage_passed' THEN 3
    ELSE 4
  END,
  rs.second_stage_submitted_at DESC NULLS LAST,
  p.created_at DESC;

-- 管理者ダッシュボードの統計情報を更新
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS TABLE (
  total_users bigint,
  total_parks bigint,
  pending_parks bigint,
  pending_vaccines bigint,
  total_reservations bigint,
  monthly_revenue bigint,
  last_month_revenue bigint,
  total_subscriptions bigint,
  active_subscriptions bigint,
  new_users_this_month bigint,
  unread_messages bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM profiles) as total_users,
    (SELECT COUNT(*) FROM dog_parks) as total_parks,
    (SELECT COUNT(*) FROM dog_parks WHERE status IN ('pending', 'first_stage_passed', 'second_stage_review')) as pending_parks,
    (SELECT COUNT(*) FROM vaccine_certifications WHERE status = 'pending') as pending_vaccines,
    (SELECT COUNT(*) FROM reservations WHERE date >= date_trunc('month', now())) as total_reservations,
    (SELECT COALESCE(SUM(total_amount), 0) FROM reservations WHERE date >= date_trunc('month', now())) as monthly_revenue,
    (SELECT COALESCE(SUM(total_amount), 0) FROM reservations WHERE date >= date_trunc('month', now() - interval '1 month') AND date < date_trunc('month', now())) as last_month_revenue,
    (SELECT COUNT(*) FROM stripe_subscriptions WHERE deleted_at IS NULL) as total_subscriptions,
    (SELECT COUNT(*) FROM stripe_subscriptions WHERE status = 'active' AND deleted_at IS NULL) as active_subscriptions,
    (SELECT COUNT(*) FROM profiles WHERE created_at >= date_trunc('month', now())) as new_users_this_month,
    (SELECT COUNT(*) FROM contact_messages WHERE status = 'new') as unread_messages;
END;
$$;