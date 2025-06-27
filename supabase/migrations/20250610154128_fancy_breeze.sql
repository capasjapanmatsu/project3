/*
  # capasjapanアカウントのワクチン承認状況更新

  1. 対象ユーザーの特定
    - capasjapanアカウント（メールアドレスベース）のユーザーIDを取得
  
  2. ワクチン証明書の承認
    - 該当ユーザーの全ての犬のワクチン証明書を承認済みに変更
    - 承認日時を現在時刻に設定
    - 有効期限を適切に設定（1年後）
  
  3. セキュリティ
    - 特定のユーザーのみを対象とした安全な更新
*/

-- capasjapanアカウントのワクチン証明書を全て承認済みに更新
DO $$
DECLARE
  capas_user_id uuid;
  dog_record RECORD;
BEGIN
  -- capasjapanアカウントのユーザーIDを取得
  SELECT id INTO capas_user_id
  FROM auth.users
  WHERE email = 'capasjapan@example.com'
  LIMIT 1;
  
  -- ユーザーが見つからない場合は処理を終了
  IF capas_user_id IS NULL THEN
    RAISE NOTICE 'capasjapanアカウントが見つかりませんでした';
    RETURN;
  END IF;
  
  RAISE NOTICE 'capasjapanアカウント (%) のワクチン証明書を更新中...', capas_user_id;
  
  -- capasjapanアカウントの全ての犬を取得
  FOR dog_record IN
    SELECT id, name FROM dogs WHERE owner_id = capas_user_id
  LOOP
    RAISE NOTICE '犬 % (%) のワクチン証明書を処理中...', dog_record.name, dog_record.id;
    
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
          WHEN rabies_expiry_date IS NULL THEN (now() + interval '1 year')::date
          ELSE rabies_expiry_date
        END,
        combo_expiry_date = CASE 
          WHEN combo_expiry_date IS NULL THEN (now() + interval '1 year')::date
          ELSE combo_expiry_date
        END,
        last_checked_at = now(),
        expiry_notification_sent = false
      WHERE dog_id = dog_record.id;
      
      RAISE NOTICE '犬 % の既存ワクチン証明書を承認済みに更新しました', dog_record.name;
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
        'placeholder_rabies_image.jpg',
        'placeholder_combo_image.jpg',
        'approved',
        now(),
        (now() + interval '1 year')::date,
        (now() + interval '1 year')::date,
        now(),
        false
      );
      
      RAISE NOTICE '犬 % の新規ワクチン証明書を作成し承認済みに設定しました', dog_record.name;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'capasjapanアカウントのワクチン証明書更新が完了しました';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'エラーが発生しました: %', SQLERRM;
END $$;

-- 更新結果を確認するためのクエリ（ログ出力用）
DO $$
DECLARE
  capas_user_id uuid;
  approved_count integer;
  total_dogs integer;
BEGIN
  -- capasjapanアカウントのユーザーIDを取得
  SELECT id INTO capas_user_id
  FROM auth.users
  WHERE email = 'capasjapan@example.com'
  LIMIT 1;
  
  IF capas_user_id IS NOT NULL THEN
    -- 総犬数を取得
    SELECT COUNT(*) INTO total_dogs
    FROM dogs
    WHERE owner_id = capas_user_id;
    
    -- 承認済みワクチン証明書数を取得
    SELECT COUNT(*) INTO approved_count
    FROM vaccine_certifications vc
    JOIN dogs d ON vc.dog_id = d.id
    WHERE d.owner_id = capas_user_id
      AND vc.status = 'approved';
    
    RAISE NOTICE '=== 更新結果 ===';
    RAISE NOTICE 'capasjapanアカウントの総犬数: %', total_dogs;
    RAISE NOTICE '承認済みワクチン証明書数: %', approved_count;
    RAISE NOTICE '更新完了: %', CASE WHEN approved_count = total_dogs THEN '成功' ELSE '一部失敗' END;
  END IF;
END $$;