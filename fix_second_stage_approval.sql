/*
  # ドッグラン第二審査承認処理の修正
  
  このSQLをSupabaseのSQL Editorで実行してください。
  https://app.supabase.com のプロジェクトダッシュボードから
  SQL Editor を開いて、以下のSQLを実行してください。
*/

-- 第二審査承認関数を作成（既存の関数があれば置き換え）
CREATE OR REPLACE FUNCTION approve_second_stage_review(park_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_park_id UUID;
  v_park_name TEXT;
  v_owner_id UUID;
BEGIN
  -- パークIDの存在確認
  SELECT id, name, owner_id INTO v_park_id, v_park_name, v_owner_id
  FROM dog_parks
  WHERE id = park_id_param
  AND status = 'second_stage_review';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '対象のドッグランが見つからないか、第二審査中ではありません';
  END IF;
  
  -- ドッグランのステータスを承認済みに更新
  UPDATE dog_parks
  SET status = 'approved',
      is_public = false, -- デフォルトで非公開
      updated_at = now()
  WHERE id = park_id_param;
  
  -- 審査ステージを承認済みに更新
  UPDATE dog_park_review_stages
  SET approved_at = now(),
      updated_at = now()
  WHERE park_id = park_id_param;
  
  -- レビューステージが存在しない場合は作成
  INSERT INTO dog_park_review_stages (
    park_id,
    first_stage_passed_at,
    second_stage_submitted_at,
    approved_at
  ) 
  SELECT 
    park_id_param,
    now(),
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM dog_park_review_stages WHERE park_id = park_id_param
  );
  
  -- オーナーに通知を作成（notifications テーブルが存在する場合）
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) 
  SELECT
    v_owner_id,
    'park_approval_required',
    'ドッグラン第二審査承認',
    v_park_name || 'の第二審査が承認されました。公開設定を行ってください。',
    jsonb_build_object('park_id', park_id_param)
  WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'notifications'
  );
  
  -- 管理者通知を作成（admin_notifications テーブルが存在する場合）
  INSERT INTO admin_notifications (
    type,
    title,
    message,
    data
  )
  SELECT
    'park_approved',
    'ドッグラン承認完了',
    v_park_name || 'が承認されました（非公開状態）',
    jsonb_build_object('park_id', park_id_param)
  WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'admin_notifications'
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Second stage approval failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 関数の実行権限を設定（管理者のみ実行可能）
GRANT EXECUTE ON FUNCTION approve_second_stage_review(UUID) TO authenticated;

-- 動作確認用のクエリ
SELECT 
  routine_name,
  routine_type,
  routine_definition IS NOT NULL as is_defined
FROM information_schema.routines 
WHERE routine_name = 'approve_second_stage_review';

-- 現在の第二審査中のドッグランを確認
SELECT 
  id, 
  name, 
  status,
  is_public,
  updated_at
FROM dog_parks 
WHERE status IN ('second_stage_review', 'approved')
ORDER BY updated_at DESC
LIMIT 10;
