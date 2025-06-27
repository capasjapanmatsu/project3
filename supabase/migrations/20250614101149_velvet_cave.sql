/*
  # Owner Bank Account Form Functions

  1. New Functions
    - update_owner_bank_account: オーナーの銀行口座情報を更新する関数
    - get_owner_bank_account: オーナーの銀行口座情報を取得する関数
    - validate_bank_account: 銀行口座情報を検証する関数
*/

-- 銀行口座情報を検証する関数
CREATE OR REPLACE FUNCTION validate_bank_account(
  bank_name_param text,
  bank_code_param text,
  branch_name_param text,
  branch_code_param text,
  account_type_param text,
  account_number_param text,
  account_holder_name_param text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- 必須項目のチェック
  IF bank_name_param IS NULL OR bank_name_param = '' THEN
    RAISE EXCEPTION '銀行名は必須です';
  END IF;
  
  IF bank_code_param IS NULL OR bank_code_param = '' THEN
    RAISE EXCEPTION '銀行コードは必須です';
  END IF;
  
  IF branch_name_param IS NULL OR branch_name_param = '' THEN
    RAISE EXCEPTION '支店名は必須です';
  END IF;
  
  IF branch_code_param IS NULL OR branch_code_param = '' THEN
    RAISE EXCEPTION '支店コードは必須です';
  END IF;
  
  IF account_type_param IS NULL OR account_type_param = '' THEN
    RAISE EXCEPTION '口座種別は必須です';
  END IF;
  
  IF account_number_param IS NULL OR account_number_param = '' THEN
    RAISE EXCEPTION '口座番号は必須です';
  END IF;
  
  IF account_holder_name_param IS NULL OR account_holder_name_param = '' THEN
    RAISE EXCEPTION '口座名義は必須です';
  END IF;
  
  -- 口座種別のチェック
  IF account_type_param NOT IN ('ordinary', 'checking') THEN
    RAISE EXCEPTION '口座種別は普通または当座のみ有効です';
  END IF;
  
  -- 銀行コードのチェック（数字4桁）
  IF NOT bank_code_param ~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION '銀行コードは4桁の数字で入力してください';
  END IF;
  
  -- 支店コードのチェック（数字3桁）
  IF NOT branch_code_param ~ '^[0-9]{3}$' THEN
    RAISE EXCEPTION '支店コードは3桁の数字で入力してください';
  END IF;
  
  -- 口座番号のチェック（数字7桁）
  IF NOT account_number_param ~ '^[0-9]{7}$' THEN
    RAISE EXCEPTION '口座番号は7桁の数字で入力してください';
  END IF;
  
  RETURN true;
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
SECURITY DEFINER
AS $$
DECLARE
  owner_id_val uuid;
  bank_account_id uuid;
BEGIN
  -- 現在のユーザーIDを取得
  owner_id_val := auth.uid();
  
  -- ユーザーがオーナーかどうかチェック
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = owner_id_val AND user_type = 'owner'
  ) THEN
    RAISE EXCEPTION 'オーナー権限が必要です';
  END IF;
  
  -- 銀行口座情報を検証
  PERFORM validate_bank_account(
    bank_name_param,
    bank_code_param,
    branch_name_param,
    branch_code_param,
    account_type_param,
    account_number_param,
    account_holder_name_param
  );
  
  -- 既存の銀行口座情報があるか確認
  SELECT id INTO bank_account_id
  FROM owner_bank_accounts
  WHERE owner_id = owner_id_val;
  
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
    owner_id_val,
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
  account_holder_name text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  owner_id_val uuid;
BEGIN
  -- 現在のユーザーIDを取得
  owner_id_val := auth.uid();
  
  -- ユーザーがオーナーかどうかチェック
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = owner_id_val AND user_type = 'owner'
  ) THEN
    RAISE EXCEPTION 'オーナー権限が必要です';
  END IF;
  
  RETURN QUERY
  SELECT
    oba.id,
    oba.bank_name,
    oba.bank_code,
    oba.branch_name,
    oba.branch_code,
    oba.account_type,
    oba.account_number,
    oba.account_holder_name,
    oba.created_at,
    oba.updated_at
  FROM
    owner_bank_accounts oba
  WHERE
    oba.owner_id = owner_id_val
  ORDER BY
    oba.created_at DESC
  LIMIT 1;
END;
$$;

-- オーナーの月次売上を取得する関数
CREATE OR REPLACE FUNCTION get_owner_monthly_revenue(
  year_param integer,
  month_param integer
)
RETURNS TABLE (
  park_id uuid,
  park_name text,
  total_revenue bigint,
  platform_fee bigint,
  owner_payout bigint,
  payout_status text,
  payout_date timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  owner_id_val uuid;
BEGIN
  -- 現在のユーザーIDを取得
  owner_id_val := auth.uid();
  
  -- ユーザーがオーナーかどうかチェック
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = owner_id_val AND user_type = 'owner'
  ) THEN
    RAISE EXCEPTION 'オーナー権限が必要です';
  END IF;
  
  RETURN QUERY
  SELECT
    mp.park_id,
    dp.name AS park_name,
    mp.total_revenue,
    mp.platform_fee,
    mp.owner_payout,
    mp.status AS payout_status,
    mp.payout_date
  FROM
    monthly_payouts mp
  JOIN
    dog_parks dp ON mp.park_id = dp.id
  WHERE
    mp.owner_id = owner_id_val
    AND mp.year = year_param
    AND mp.month = month_param
  ORDER BY
    mp.owner_payout DESC;
END;
$$;

-- オーナーの売上履歴を取得する関数
CREATE OR REPLACE FUNCTION get_owner_revenue_history(
  limit_param integer DEFAULT 12
)
RETURNS TABLE (
  year integer,
  month integer,
  total_revenue bigint,
  platform_fee bigint,
  owner_payout bigint,
  payout_status text,
  payout_date timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  owner_id_val uuid;
BEGIN
  -- 現在のユーザーIDを取得
  owner_id_val := auth.uid();
  
  -- ユーザーがオーナーかどうかチェック
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = owner_id_val AND user_type = 'owner'
  ) THEN
    RAISE EXCEPTION 'オーナー権限が必要です';
  END IF;
  
  RETURN QUERY
  SELECT
    mp.year,
    mp.month,
    SUM(mp.total_revenue) AS total_revenue,
    SUM(mp.platform_fee) AS platform_fee,
    SUM(mp.owner_payout) AS owner_payout,
    -- 複数のパークがある場合は、すべてcompletedの場合のみcompletedとする
    CASE
      WHEN bool_and(mp.status = 'completed') THEN 'completed'
      WHEN bool_or(mp.status = 'processing') THEN 'processing'
      ELSE 'pending'
    END AS payout_status,
    MAX(mp.payout_date) AS payout_date
  FROM
    monthly_payouts mp
  WHERE
    mp.owner_id = owner_id_val
  GROUP BY
    mp.year, mp.month
  ORDER BY
    mp.year DESC, mp.month DESC
  LIMIT limit_param;
END;
$$;