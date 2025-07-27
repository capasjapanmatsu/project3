-- ドッグラン却下時の削除処理用RPC関数
-- 管理者がドッグランを却下する際に、関連データを安全に削除し、オーナーに通知を送信

CREATE OR REPLACE FUNCTION reject_and_delete_park(
  p_park_id UUID,
  p_admin_id UUID,
  p_rejection_reason TEXT DEFAULT '申請内容に不備があったため'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_park_record RECORD;
  v_result JSON;
BEGIN
  -- 管理者権限チェック
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_admin_id AND role = 'admin'
  ) THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'message', '管理者権限が必要です'
    );
  END IF;

  -- ドッグラン情報を取得
  SELECT * INTO v_park_record
  FROM dog_parks dp
  JOIN profiles p ON dp.owner_id = p.id
  WHERE dp.id = p_park_id;

  IF NOT FOUND THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'message', 'ドッグランが見つかりません'
    );
  END IF;

  -- 却下通知を送信
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    created_at,
    read
  ) VALUES (
    v_park_record.owner_id,
    'ドッグラン申請却下について',
    v_park_record.name || 'の申請が却下されました。再申請する場合は、再度申し込みよりお手続きしてください。',
    'park_rejected',
    NOW(),
    false
  );

  -- 関連データを順次削除
  
  -- 1. ニュース・お知らせを削除（park_idカラムが存在する場合のみ）
  BEGIN
    -- カラムの存在確認
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'news_announcements' 
      AND column_name = 'park_id'
    ) THEN
      DELETE FROM news_announcements WHERE park_id = p_park_id;
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      -- テーブルが存在しない場合は無視
      NULL;
  END;

  -- 2. 新規開園情報を削除（park_idカラムが存在する場合のみ）
  BEGIN
    -- カラムの存在確認
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'new_park_openings' 
      AND column_name = 'park_id'
    ) THEN
      DELETE FROM new_park_openings WHERE park_id = p_park_id;
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      -- テーブルが存在しない場合は無視
      NULL;
  END;

  -- 3. 施設画像を削除
  DELETE FROM dog_park_facility_images 
  WHERE park_id = p_park_id;

  -- 4. 予約データを削除
  DELETE FROM reservations 
  WHERE dog_park_id = p_park_id;

  -- 5. レビューを削除
  BEGIN
    DELETE FROM reviews WHERE park_id = p_park_id;
  EXCEPTION
    WHEN undefined_table THEN
      DELETE FROM dog_park_reviews WHERE park_id = p_park_id;
  END;

  -- 6. オーナーの銀行口座情報を削除（このドッグラン専用の場合）
  DELETE FROM owner_bank_accounts 
  WHERE owner_id = v_park_record.owner_id 
  AND NOT EXISTS (
    SELECT 1 FROM dog_parks 
    WHERE owner_id = v_park_record.owner_id 
    AND id != p_park_id
  );

  -- 7. スマートロック情報を削除
  DELETE FROM smart_locks 
  WHERE park_id = p_park_id;

  -- 8. メインのドッグランレコードを削除
  DELETE FROM dog_parks 
  WHERE id = p_park_id;

  -- 管理ログに記録
  INSERT INTO admin_action_logs (
    admin_id,
    action_type,
    target_type,
    target_id,
    description,
    created_at
  ) VALUES (
    p_admin_id,
    'park_rejection_delete',
    'dog_park',
    p_park_id,
    '却下によりドッグラン削除: ' || v_park_record.name || ' (オーナー: ' || v_park_record.email || ')',
    NOW()
  );

  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'message', 'ドッグラン申請を却下し、データを削除しました',
    'park_name', v_park_record.name,
    'owner_email', v_park_record.email
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'message', 'エラーが発生しました: ' || SQLERRM
    );
END;
$$;

-- 管理者権限のユーザーのみがこの関数を実行できるように設定
REVOKE EXECUTE ON FUNCTION reject_and_delete_park FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reject_and_delete_park TO authenticated;

-- 使用例のコメント
-- SELECT reject_and_delete_park(
--   'ドッグランのUUID'::uuid,
--   '管理者のUUID'::uuid,
--   '申請書類に不備があったため'
-- ); 