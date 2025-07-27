-- ドッグラン却下機能のテスト用データとテスト手順

-- 1. まず、reject_and_delete_park関数が作成されていることを確認
-- SELECT routine_name FROM information_schema.routines WHERE routine_name = 'reject_and_delete_park';

-- 2. テスト用ユーザーとドッグランを作成（既存のユーザーIDを使用）

-- 現在のユーザーIDを確認
-- SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- テスト用ドッグランを作成（実際のユーザーIDに置き換えてください）
DO $$
DECLARE
  test_user_id UUID;
  test_park_id UUID;
BEGIN
  -- 最新のユーザーを取得
  SELECT id INTO test_user_id FROM auth.users ORDER BY created_at DESC LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- テスト用ドッグランを作成
    INSERT INTO dog_parks (
      id,
      owner_id,
      name,
      description,
      address,
      price_per_hour,
      max_capacity,
      status,
      large_dog_area,
      small_dog_area,
      private_booths,
      facilities,
      business_hours,
      created_at
    ) VALUES (
      gen_random_uuid(),
      test_user_id,
      '【テスト用】却下予定ドッグラン',
      'このドッグランは却下機能のテストのために作成されました。',
      '東京都テスト区テスト町1-1-1',
      1000,
      20,
      'first_stage_passed',
      true,
      true,
      false,
      jsonb_build_object(
        'parking', true,
        'shower', false,
        'restroom', true,
        'agility', false
      ),
      jsonb_build_object(
        'monday', jsonb_build_object('open', '09:00', 'close', '18:00'),
        'tuesday', jsonb_build_object('open', '09:00', 'close', '18:00'),
        'wednesday', jsonb_build_object('open', '09:00', 'close', '18:00'),
        'thursday', jsonb_build_object('open', '09:00', 'close', '18:00'),
        'friday', jsonb_build_object('open', '09:00', 'close', '18:00'),
        'saturday', jsonb_build_object('open', '08:00', 'close', '19:00'),
        'sunday', jsonb_build_object('open', '08:00', 'close', '19:00')
      ),
      NOW()
    ) RETURNING id INTO test_park_id;

    -- テスト用施設画像を追加
    INSERT INTO dog_park_facility_images (
      park_id,
      image_type,
      image_url,
      is_approved,
      created_at
    ) VALUES 
      (test_park_id, 'main', 'https://example.com/test-main.jpg', NULL, NOW()),
      (test_park_id, 'entrance', 'https://example.com/test-entrance.jpg', NULL, NOW());

    -- テスト用予約を追加
    INSERT INTO reservations (
      user_id,
      dog_park_id,
      reservation_date,
      start_time,
      end_time,
      total_amount,
      status,
      created_at
    ) VALUES (
      test_user_id,
      test_park_id,
      CURRENT_DATE + 1,
      '10:00:00',
      '12:00:00',
      2000,
      'confirmed',
      NOW()
    );

    RAISE NOTICE 'テスト用ドッグランが作成されました: %', test_park_id;
    RAISE NOTICE 'オーナー: %', test_user_id;
  ELSE
    RAISE NOTICE 'ユーザーが見つかりません。まずユーザーを作成してください。';
  END IF;
END $$;

-- 3. 管理者権限のユーザーを確認
-- SELECT id, email FROM profiles WHERE role = 'admin';

-- 4. テスト実行手順のコメント:
/*
テスト手順:

1. 管理者でログイン
2. /admin/parks にアクセス
3. 「【テスト用】却下予定ドッグラン」を探す
4. 「却下」ボタンをクリック
5. 確認ダイアログで「OK」をクリック
6. 以下を確認:
   - 成功メッセージが表示される
   - ドッグランがリストから消える
   - オーナーのマイページからも消える
   - オーナーに通知が送信される

データベースでの確認:
- SELECT * FROM dog_parks WHERE name LIKE '%テスト用%'; (空の結果になるはず)
- SELECT * FROM notifications WHERE type = 'park_rejected' ORDER BY created_at DESC; (通知が作成される)
- SELECT * FROM admin_action_logs WHERE action_type = 'park_rejection_delete' ORDER BY created_at DESC; (ログが作成される)
*/

-- 5. テスト後のクリーンアップ
-- 通常は削除機能で自動的にクリーンアップされますが、手動でクリーンアップする場合:
/*
DELETE FROM notifications WHERE message LIKE '%テスト用%';
DELETE FROM admin_action_logs WHERE description LIKE '%テスト用%';
*/ 