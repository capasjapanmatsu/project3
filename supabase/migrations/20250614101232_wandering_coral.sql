/*
  # Sample Revenue Data for Development

  This migration adds sample revenue data for development purposes.
  It will only run in development environments.
*/

-- サンプルデータ挿入（開発環境用）
DO $$
DECLARE
  owner_id uuid;
  park_id uuid;
  bank_account_id uuid;
  current_year integer;
  current_month integer;
BEGIN
  -- 開発環境でのみ実行
  IF current_setting('app.environment', true) != 'production' THEN
    -- 現在の年月を取得
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    current_month := EXTRACT(MONTH FROM CURRENT_DATE);
    
    -- サンプルオーナーを取得
    SELECT id INTO owner_id
    FROM profiles
    WHERE user_type = 'owner'
    LIMIT 1;
    
    IF owner_id IS NULL THEN
      RAISE NOTICE 'No owner found, creating sample owner';
      
      -- サンプルオーナーを作成
      INSERT INTO profiles (
        id,
        user_type,
        name,
        postal_code,
        address,
        phone_number
      ) VALUES (
        gen_random_uuid(),
        'owner',
        'サンプルオーナー',
        '123-4567',
        '東京都渋谷区渋谷1-1-1',
        '090-1234-5678'
      )
      RETURNING id INTO owner_id;
    END IF;
    
    -- サンプルドッグランを取得
    SELECT id INTO park_id
    FROM dog_parks
    WHERE owner_id = owner_id
    LIMIT 1;
    
    IF park_id IS NULL THEN
      RAISE NOTICE 'No dog park found, creating sample park';
      
      -- サンプルドッグランを作成
      INSERT INTO dog_parks (
        owner_id,
        name,
        description,
        address,
        price,
        max_capacity,
        status,
        facilities
      ) VALUES (
        owner_id,
        'サンプルドッグラン',
        'サンプル用のドッグランです',
        '東京都渋谷区渋谷1-1-1',
        800,
        10,
        'approved',
        '{"parking": true, "shower": true, "restroom": true, "agility": false, "rest_area": true, "water_station": true}'
      )
      RETURNING id INTO park_id;
    END IF;
    
    -- サンプル銀行口座情報を取得
    SELECT id INTO bank_account_id
    FROM owner_bank_accounts
    WHERE owner_id = owner_id
    LIMIT 1;
    
    IF bank_account_id IS NULL THEN
      RAISE NOTICE 'No bank account found, creating sample bank account';
      
      -- サンプル銀行口座情報を作成
      INSERT INTO owner_bank_accounts (
        owner_id,
        bank_name,
        bank_code,
        branch_name,
        branch_code,
        account_type,
        account_number,
        account_holder_name
      ) VALUES (
        owner_id,
        '三菱UFJ銀行',
        '0005',
        '渋谷支店',
        '135',
        'ordinary',
        '1234567',
        'ヤマダ タロウ'
      )
      RETURNING id INTO bank_account_id;
    END IF;
    
    -- 過去12ヶ月分のサンプル売上データを作成
    FOR i IN 0..11 LOOP
      DECLARE
        target_year integer;
        target_month integer;
        total_revenue integer;
        platform_fee integer;
        owner_payout integer;
        status text;
        payout_date timestamptz;
      BEGIN
        -- 対象年月を計算
        target_month := current_month - i;
        target_year := current_year;
        
        IF target_month <= 0 THEN
          target_month := target_month + 12;
          target_year := target_year - 1;
        END IF;
        
        -- 売上金額を計算（過去になるほど少なくする）
        total_revenue := 100000 - (i * 5000) + (random() * 20000)::integer;
        IF total_revenue < 10000 THEN
          total_revenue := 10000;
        END IF;
        
        platform_fee := (total_revenue * 0.2)::integer;
        owner_payout := total_revenue - platform_fee;
        
        -- ステータスを設定（3ヶ月前までは完了、それ以降は保留）
        IF i <= 2 THEN
          status := 'completed';
          payout_date := (current_date - (i * 30 + 15))::timestamptz;
        ELSE
          status := 'pending';
          payout_date := NULL;
        END IF;
        
        -- 月次売上データを挿入
        INSERT INTO monthly_payouts (
          owner_id,
          park_id,
          year,
          month,
          total_revenue,
          platform_fee,
          owner_payout,
          status,
          payout_date,
          bank_account_id
        ) VALUES (
          owner_id,
          park_id,
          target_year,
          target_month,
          total_revenue,
          platform_fee,
          owner_payout,
          status,
          payout_date,
          bank_account_id
        )
        ON CONFLICT (owner_id, park_id, year, month) DO NOTHING;
      END;
    END LOOP;
    
    RAISE NOTICE 'Sample revenue data inserted successfully';
  END IF;
END
$$;