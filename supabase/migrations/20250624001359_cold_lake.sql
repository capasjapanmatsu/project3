-- 友達申請可能かチェックする関数（同じドッグランで出会った場合のみ可能）
CREATE OR REPLACE FUNCTION can_send_friend_request(p_requester_id uuid, p_requested_id uuid)
RETURNS boolean AS $$
DECLARE
  v_can_send boolean;
BEGIN
  -- 同じドッグランで出会ったことがあるか確認
  SELECT EXISTS (
    SELECT 1
    FROM dog_encounters de
    JOIN dogs d1 ON de.dog1_id = d1.id
    JOIN dogs d2 ON de.dog2_id = d2.id
    WHERE (d1.owner_id = p_requester_id AND d2.owner_id = p_requested_id)
    OR (d1.owner_id = p_requested_id AND d2.owner_id = p_requester_id)
  ) INTO v_can_send;
  
  RETURN v_can_send;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 入場権限チェック関数の更新（共有QRコードに対応）
-- 注意: 既に20250623124401_muddy_prism.sqlで作成されているため、ここでは作成しない