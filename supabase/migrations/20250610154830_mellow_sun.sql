/*
  # capasjapanアカウントのワクチン証明書承認と管理者設定

  1. ワクチン証明書の承認
    - capasjapan@gmail.comアカウントの全ての犬のワクチン証明書を承認済みに設定
    - 有効期限を1年後に設定
    - 既存の証明書がない場合は新規作成

  2. 管理者権限の設定
    - プロフィールのuser_typeを'admin'に変更
    - 管理者として必要な権限を付与

  3. 確認とログ出力
    - 更新結果の確認
    - 処理状況のログ出力
*/

-- capasjapanアカウントのワクチン証明書承認と管理者設定
DO $$
DECLARE
  capas_user_id uuid;
  dog_record RECORD;
  approved_count integer := 0;
  created_count integer := 0;
  total_dogs integer := 0;
BEGIN
  -- capasjapan@gmail.comアカウントのユーザーIDを取得
  SELECT id INTO capas_user_id
  FROM auth.users
  WHERE email = 'capasjapan@gmail.com'
  LIMIT 1;
  
  -- ユーザーが見つからない場合は処理を終了
  IF capas_user_id IS NULL THEN
    RAISE NOTICE 'capasjapan@gmail.comアカウントが見つかりませんでした';
    RETURN;
  END IF;
  
  RAISE NOTICE '=== capasjapan@gmail.comアカウントの設定開始 ===';
  RAISE NOTICE 'ユーザーID: %', capas_user_id;
  
  -- 1. プロフィールを管理者に設定
  UPDATE profiles
  SET user_type = 'admin'
  WHERE id = capas_user_id;
  
  IF FOUND THEN
    RAISE NOTICE '✓ プロフィールを管理者に設定しました';
  ELSE
    RAISE NOTICE '⚠ プロフィールが見つからないか、既に管理者に設定されています';
  END IF;
  
  -- 2. capasjapanアカウントの全ての犬を取得
  SELECT COUNT(*) INTO total_dogs FROM dogs WHERE owner_id = capas_user_id;
  RAISE NOTICE '対象の犬の数: %', total_dogs;
  
  -- 各犬のワクチン証明書を処理
  FOR dog_record IN
    SELECT id, name FROM dogs WHERE owner_id = capas_user_id
  LOOP
    RAISE NOTICE '犬 "%s" (ID: %) を処理中...', dog_record.name, dog_record.id;
    
    -- 既存のワクチン証明書があるかチェック
    IF EXISTS (
      SELECT 1 FROM vaccine_certifications 
      WHERE dog_id = dog_record.id
    ) THEN
      -- 既存の証明書を承認済みに更新
      UPDATE vaccine_certifications
      SET 
        status = 'approved',
        approved_at = now(),
        rabies_expiry_date = CASE 
          WHEN rabies_expiry_date IS NULL OR rabies_expiry_date <= now()::date 
          THEN (now() + interval '1 year')::date
          ELSE rabies_expiry_date
        END,
        combo_expiry_date = CASE 
          WHEN combo_expiry_date IS NULL OR combo_expiry_date <= now()::date 
          THEN (now() + interval '1 year')::date
          ELSE combo_expiry_date
        END,
        last_checked_at = now(),
        expiry_notification_sent = false
      WHERE dog_id = dog_record.id;
      
      approved_count := approved_count + 1;
      RAISE NOTICE '  ✓ 既存のワクチン証明書を承認済みに更新';
    ELSE
      -- ワクチン証明書が存在しない場合は新規作成
      INSERT INTO vaccine_certifications (
        dog_id,
        rabies_vaccine_image,
        combo_vaccine_image,
        status,
        approved_at,
        rabies_expiry_date,
        combo_expiry_date,
        last_checked_at,
        expiry_notification_sent
      ) VALUES (
        dog_record.id,
        'admin_approved_rabies_cert.jpg',
        'admin_approved_combo_cert.jpg',
        'approved',
        now(),
        (now() + interval '1 year')::date,
        (now() + interval '1 year')::date,
        now(),
        false
      );
      
      created_count := created_count + 1;
      RAISE NOTICE '  ✓ 新規ワクチン証明書を作成し承認済みに設定';
    END IF;
  END LOOP;
  
  -- 3. 結果の確認と出力
  RAISE NOTICE '=== 処理結果 ===';
  RAISE NOTICE '総犬数: %', total_dogs;
  RAISE NOTICE '既存証明書の更新: %件', approved_count;
  RAISE NOTICE '新規証明書の作成: %件', created_count;
  RAISE NOTICE '処理完了: %', CASE WHEN (approved_count + created_count) = total_dogs THEN '✓ 成功' ELSE '⚠ 一部失敗' END;
  
  -- 最終確認クエリ
  SELECT COUNT(*) INTO approved_count
  FROM vaccine_certifications vc
  JOIN dogs d ON vc.dog_id = d.id
  WHERE d.owner_id = capas_user_id
    AND vc.status = 'approved';
  
  RAISE NOTICE '最終確認 - 承認済みワクチン証明書数: %', approved_count;
  
  IF approved_count = total_dogs AND total_dogs > 0 THEN
    RAISE NOTICE '🎉 capasjapan@gmail.comアカウントの設定が完了しました！';
    RAISE NOTICE '   - 管理者権限: 有効';
    RAISE NOTICE '   - ワクチン証明書: 全て承認済み (%件)', approved_count;
  ELSE
    RAISE NOTICE '⚠ 設定に問題がある可能性があります。手動確認をお願いします。';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ エラーが発生しました: %', SQLERRM;
    RAISE NOTICE '詳細: %', SQLSTATE;
END $$;

-- 管理者権限の確認クエリ（ログ出力用）
DO $$
DECLARE
  capas_user_id uuid;
  user_type_result text;
  dog_count integer;
  approved_cert_count integer;
BEGIN
  SELECT id INTO capas_user_id
  FROM auth.users
  WHERE email = 'capasjapan@gmail.com'
  LIMIT 1;
  
  IF capas_user_id IS NOT NULL THEN
    -- プロフィール情報を取得
    SELECT user_type INTO user_type_result
    FROM profiles
    WHERE id = capas_user_id;
    
    -- 犬の数を取得
    SELECT COUNT(*) INTO dog_count
    FROM dogs
    WHERE owner_id = capas_user_id;
    
    -- 承認済みワクチン証明書数を取得
    SELECT COUNT(*) INTO approved_cert_count
    FROM vaccine_certifications vc
    JOIN dogs d ON vc.dog_id = d.id
    WHERE d.owner_id = capas_user_id
      AND vc.status = 'approved';
    
    RAISE NOTICE '=== 最終確認結果 ===';
    RAISE NOTICE 'アカウント: capasjapan@gmail.com';
    RAISE NOTICE 'ユーザータイプ: %', COALESCE(user_type_result, '未設定');
    RAISE NOTICE '登録犬数: %', dog_count;
    RAISE NOTICE '承認済みワクチン証明書: %', approved_cert_count;
    RAISE NOTICE '管理者設定: %', CASE WHEN user_type_result = 'admin' THEN '✓ 完了' ELSE '❌ 未完了' END;
    RAISE NOTICE 'ワクチン承認: %', CASE WHEN approved_cert_count = dog_count AND dog_count > 0 THEN '✓ 完了' ELSE CASE WHEN dog_count = 0 THEN '犬未登録' ELSE '❌ 未完了' END END;
  END IF;
END $$;