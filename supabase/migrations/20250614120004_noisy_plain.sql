-- オーナーの銀行口座情報を保存するテーブル
CREATE TABLE IF NOT EXISTS owner_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  bank_code text NOT NULL,
  branch_name text NOT NULL,
  branch_code text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('ordinary', 'checking')),
  account_number text NOT NULL,
  account_holder_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS owner_bank_accounts_owner_id_idx ON owner_bank_accounts(owner_id);

-- RLSを有効化
ALTER TABLE owner_bank_accounts ENABLE ROW LEVEL SECURITY;

-- オーナーは自分の銀行口座情報のみ管理可能
CREATE POLICY "オーナーは自分の銀行口座情報のみ管理可能" 
  ON owner_bank_accounts
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 管理者はすべての銀行口座情報を閲覧可能
CREATE POLICY "管理者はすべての銀行口座情報を閲覧可能" 
  ON owner_bank_accounts
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'capasjapan@gmail.com');

-- 月次の振込記録を保存するテーブル
CREATE TABLE IF NOT EXISTS monthly_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  park_id uuid NOT NULL REFERENCES dog_parks(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  total_revenue bigint NOT NULL DEFAULT 0,
  platform_fee bigint NOT NULL DEFAULT 0,
  owner_payout bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed')),
  payout_date timestamptz,
  bank_account_id uuid REFERENCES owner_bank_accounts(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS monthly_payouts_owner_id_idx ON monthly_payouts(owner_id);
CREATE INDEX IF NOT EXISTS monthly_payouts_park_id_idx ON monthly_payouts(park_id);
CREATE INDEX IF NOT EXISTS monthly_payouts_year_month_idx ON monthly_payouts(year, month);
CREATE INDEX IF NOT EXISTS monthly_payouts_status_idx ON monthly_payouts(status);

-- RLSを有効化
ALTER TABLE monthly_payouts ENABLE ROW LEVEL SECURITY;

-- オーナーは自分の振込記録のみ閲覧可能
CREATE POLICY "オーナーは自分の振込記録のみ閲覧可能" 
  ON monthly_payouts
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- 管理者はすべての振込記録を管理可能
CREATE POLICY "管理者はすべての振込記録を管理可能" 
  ON monthly_payouts
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'capasjapan@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'capasjapan@gmail.com');

-- 既存の関数を削除してから再作成（リターン型が変更されるため）
DROP FUNCTION IF EXISTS get_monthly_revenue_by_park(date, date);

-- 月別のドッグラン売上を取得する関数
CREATE OR REPLACE FUNCTION get_monthly_revenue_by_park(
  start_date_param date,
  end_date_param date
)
RETURNS TABLE (
  park_id uuid,
  park_name text,
  owner_id uuid,
  owner_name text,
  total_revenue bigint,
  bank_name text,
  bank_code text,
  branch_name text,
  branch_code text,
  account_type text,
  account_number text,
  account_holder_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 管理者権限チェック
  IF auth.jwt() ->> 'email' != 'capasjapan@gmail.com' THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;

  RETURN QUERY
  WITH park_revenue AS (
    -- 通常予約の売上
    SELECT
      r.park_id,
      SUM(r.total_amount) AS revenue
    FROM
      reservations r
    WHERE
      r.date BETWEEN start_date_param AND end_date_param
      AND r.status = 'confirmed'
    GROUP BY
      r.park_id
  )
  SELECT
    dp.id AS park_id,
    dp.name AS park_name,
    dp.owner_id,
    p.name AS owner_name,
    COALESCE(pr.revenue, 0) AS total_revenue,
    oba.bank_name,
    oba.bank_code,
    oba.branch_name,
    oba.branch_code,
    oba.account_type,
    oba.account_number,
    oba.account_holder_name
  FROM
    dog_parks dp
  JOIN
    profiles p ON dp.owner_id = p.id
  LEFT JOIN
    park_revenue pr ON dp.id = pr.park_id
  LEFT JOIN
    owner_bank_accounts oba ON dp.owner_id = oba.owner_id
  WHERE
    dp.status = 'approved'
  ORDER BY
    total_revenue DESC;
END;
$$;

-- 既存の関数を削除してから再作成（リターン型が変更されるため）
DROP FUNCTION IF EXISTS get_owner_bank_account();

-- オーナーの銀行口座情報を取得する関数
CREATE OR REPLACE FUNCTION get_owner_bank_account()
RETURNS TABLE (
  id uuid,
  bank_name text,
  bank_code text,
  branch_name text,
  branch_code text,
  account_type text,
  account_number text,
  account_holder_name text
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    oba.id,
    oba.bank_name,
    oba.bank_code,
    oba.branch_name,
    oba.branch_code,
    oba.account_type,
    oba.account_number,
    oba.account_holder_name
  FROM
    owner_bank_accounts oba
  WHERE
    oba.owner_id = auth.uid()
  ORDER BY
    oba.created_at DESC;
END;
$$;

-- オーナーの銀行口座情報を更新する関数
CREATE OR REPLACE FUNCTION update_owner_bank_account(
  bank_name_param text,
  bank_code_param text,
  branch_name_param text,
  branch_code_param text,
  account_type_param text,
  account_number_param text,
  account_holder_name_param text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  bank_account_id uuid;
BEGIN
  -- 既存の銀行口座情報を確認
  SELECT id INTO bank_account_id
  FROM owner_bank_accounts
  WHERE owner_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT 1;

  -- 既存の記録がある場合は更新
  IF bank_account_id IS NOT NULL THEN
    UPDATE owner_bank_accounts
    SET
      bank_name = bank_name_param,
      bank_code = bank_code_param,
      branch_name = branch_name_param,
      branch_code = branch_code_param,
      account_type = account_type_param,
      account_number = account_number_param,
      account_holder_name = account_holder_name_param,
      updated_at = now()
    WHERE
      id = bank_account_id;
    
    RETURN bank_account_id;
  END IF;

  -- 新規作成
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
    auth.uid(),
    bank_name_param,
    bank_code_param,
    branch_name_param,
    branch_code_param,
    account_type_param,
    account_number_param,
    account_holder_name_param
  )
  RETURNING id INTO bank_account_id;

  RETURN bank_account_id;
END;
$$;

-- 月次の振込記録を作成する関数
CREATE OR REPLACE FUNCTION record_monthly_payout(
  owner_id_param uuid,
  park_id_param uuid,
  year_param integer,
  month_param integer,
  total_revenue_param integer,
  platform_fee_param integer,
  owner_payout_param integer,
  bank_account_id_param uuid DEFAULT NULL,
  notes_param text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payout_id uuid;
BEGIN
  -- 管理者権限チェック
  IF auth.jwt() ->> 'email' != 'capasjapan@gmail.com' THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;

  -- 既存の振込記録があるか確認
  SELECT id INTO payout_id
  FROM monthly_payouts
  WHERE 
    owner_id = owner_id_param
    AND park_id = park_id_param
    AND year = year_param
    AND month = month_param;

  -- 既存の記録がある場合は更新
  IF payout_id IS NOT NULL THEN
    UPDATE monthly_payouts
    SET
      total_revenue = total_revenue_param,
      platform_fee = platform_fee_param,
      owner_payout = owner_payout_param,
      bank_account_id = COALESCE(bank_account_id_param, bank_account_id),
      notes = COALESCE(notes_param, notes),
      updated_at = now()
    WHERE
      id = payout_id;
    
    RETURN payout_id;
  END IF;

  -- 新規作成
  INSERT INTO monthly_payouts (
    owner_id,
    park_id,
    year,
    month,
    total_revenue,
    platform_fee,
    owner_payout,
    bank_account_id,
    notes
  ) VALUES (
    owner_id_param,
    park_id_param,
    year_param,
    month_param,
    total_revenue_param,
    platform_fee_param,
    owner_payout_param,
    bank_account_id_param,
    notes_param
  )
  RETURNING id INTO payout_id;

  RETURN payout_id;
END;
$$;

-- 振込完了としてマークする関数
CREATE OR REPLACE FUNCTION mark_payouts_as_completed(
  payout_ids uuid[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 管理者権限チェック
  IF auth.jwt() ->> 'email' != 'capasjapan@gmail.com' THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;

  -- 振込完了としてマーク
  UPDATE monthly_payouts
  SET
    status = 'completed',
    payout_date = now(),
    updated_at = now()
  WHERE
    id = ANY(payout_ids);

  -- 通知を送信
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  )
  SELECT
    mp.owner_id,
    'system_alert',
    '振込完了のお知らせ',
    year || '年' || month || '月分の売上 ¥' || owner_payout || 'が振り込まれました',
    jsonb_build_object(
      'year', year,
      'month', month,
      'amount', owner_payout,
      'payout_date', payout_date
    )
  FROM
    monthly_payouts mp
  WHERE
    id = ANY(payout_ids);

  RETURN true;
END;
$$;

-- 月次売上レポートを取得する関数
CREATE OR REPLACE FUNCTION get_monthly_revenue_report(
  year_param integer,
  month_param integer
)
RETURNS TABLE (
  park_id uuid,
  park_name text,
  owner_id uuid,
  owner_name text,
  total_revenue bigint,
  platform_fee bigint,
  owner_payout bigint,
  payout_status text,
  payout_date timestamptz,
  bank_name text,
  bank_code text,
  branch_name text,
  branch_code text,
  account_type text,
  account_number text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 管理者権限チェック
  IF auth.jwt() ->> 'email' != 'capasjapan@gmail.com' THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;

  RETURN QUERY
  SELECT
    mp.park_id,
    dp.name AS park_name,
    mp.owner_id,
    p.name AS owner_name,
    mp.total_revenue,
    mp.platform_fee,
    mp.owner_payout,
    mp.status AS payout_status,
    mp.payout_date,
    oba.bank_name,
    oba.bank_code,
    oba.branch_name,
    oba.branch_code,
    oba.account_type,
    oba.account_number
  FROM
    monthly_payouts mp
  JOIN
    dog_parks dp ON mp.park_id = dp.id
  JOIN
    profiles p ON mp.owner_id = p.id
  LEFT JOIN
    owner_bank_accounts oba ON mp.bank_account_id = oba.id
  WHERE
    mp.year = year_param
    AND mp.month = month_param
  ORDER BY
    mp.owner_payout DESC;
END;
$$;

-- サンプルデータ挿入（開発環境用）
DO $$
DECLARE
  owner_id uuid;
  park_id uuid;
  bank_account_id uuid;
BEGIN
  -- 開発環境でのみ実行
  IF current_setting('app.environment', true) != 'production' THEN
    -- サンプルオーナーを取得
    SELECT id INTO owner_id
    FROM profiles
    WHERE user_type = 'owner'
    LIMIT 1;
    
    IF owner_id IS NULL THEN
      RAISE NOTICE 'No owner found, skipping sample data insertion';
      RETURN;
    END IF;
    
    -- サンプルドッグランを取得
    SELECT id INTO park_id
    FROM dog_parks
    WHERE owner_id = owner_id
    LIMIT 1;
    
    IF park_id IS NULL THEN
      RAISE NOTICE 'No dog park found, skipping sample data insertion';
      RETURN;
    END IF;
    
    -- サンプル銀行口座情報を挿入
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
    
    -- サンプル振込記録を挿入
    INSERT INTO monthly_payouts (
      owner_id,
      park_id,
      year,
      month,
      total_revenue,
      platform_fee,
      owner_payout,
      status,
      bank_account_id
    ) VALUES (
      owner_id,
      park_id,
      EXTRACT(YEAR FROM CURRENT_DATE),
      EXTRACT(MONTH FROM CURRENT_DATE) - 1,
      125000,
      25000,
      100000,
      'completed',
      bank_account_id
    );
    
    RAISE NOTICE 'Sample data inserted successfully';
  END IF;
END
$$;