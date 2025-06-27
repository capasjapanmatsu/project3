/*
  # Owner Revenue Dashboard Functions

  1. New Functions
    - get_owner_revenue_summary: オーナーの売上サマリーを取得する関数
    - get_owner_revenue_chart_data: オーナーの売上チャートデータを取得する関数
    - get_owner_revenue_by_park: オーナーのドッグラン別売上を取得する関数
*/

-- オーナーの売上サマリーを取得する関数
CREATE OR REPLACE FUNCTION get_owner_revenue_summary()
RETURNS TABLE (
  total_revenue_all_time bigint,
  total_revenue_this_month bigint,
  total_revenue_last_month bigint,
  total_revenue_this_year bigint,
  total_parks bigint,
  total_reservations bigint,
  pending_payout bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  owner_id_val uuid;
  current_year integer;
  current_month integer;
  last_month integer;
  last_month_year integer;
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
  
  -- 現在の年月を取得
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  current_month := EXTRACT(MONTH FROM CURRENT_DATE);
  
  -- 先月の年月を計算
  IF current_month = 1 THEN
    last_month := 12;
    last_month_year := current_year - 1;
  ELSE
    last_month := current_month - 1;
    last_month_year := current_year;
  END IF;
  
  RETURN QUERY
  SELECT
    -- 全期間の総売上
    COALESCE(SUM(mp.owner_payout), 0) AS total_revenue_all_time,
    
    -- 今月の売上
    COALESCE((
      SELECT SUM(mp2.owner_payout)
      FROM monthly_payouts mp2
      WHERE mp2.owner_id = owner_id_val
        AND mp2.year = current_year
        AND mp2.month = current_month
    ), 0) AS total_revenue_this_month,
    
    -- 先月の売上
    COALESCE((
      SELECT SUM(mp3.owner_payout)
      FROM monthly_payouts mp3
      WHERE mp3.owner_id = owner_id_val
        AND mp3.year = last_month_year
        AND mp3.month = last_month
    ), 0) AS total_revenue_last_month,
    
    -- 今年の売上
    COALESCE((
      SELECT SUM(mp4.owner_payout)
      FROM monthly_payouts mp4
      WHERE mp4.owner_id = owner_id_val
        AND mp4.year = current_year
    ), 0) AS total_revenue_this_year,
    
    -- ドッグラン数
    (
      SELECT COUNT(*)
      FROM dog_parks
      WHERE owner_id = owner_id_val
        AND status = 'approved'
    ) AS total_parks,
    
    -- 予約数（今月）
    (
      SELECT COUNT(*)
      FROM reservations r
      JOIN dog_parks dp ON r.park_id = dp.id
      WHERE dp.owner_id = owner_id_val
        AND r.date >= date_trunc('month', CURRENT_DATE)
        AND r.date < date_trunc('month', CURRENT_DATE) + interval '1 month'
    ) AS total_reservations,
    
    -- 未振込金額
    COALESCE((
      SELECT SUM(mp5.owner_payout)
      FROM monthly_payouts mp5
      WHERE mp5.owner_id = owner_id_val
        AND mp5.status = 'pending'
    ), 0) AS pending_payout
  FROM
    monthly_payouts mp
  WHERE
    mp.owner_id = owner_id_val;
END;
$$;

-- オーナーの売上チャートデータを取得する関数
CREATE OR REPLACE FUNCTION get_owner_revenue_chart_data(
  months_param integer DEFAULT 12
)
RETURNS TABLE (
  year integer,
  month integer,
  month_name text,
  total_revenue bigint,
  owner_payout bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  owner_id_val uuid;
  current_date_val date;
  start_date date;
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
  
  -- 現在の日付を取得
  current_date_val := CURRENT_DATE;
  
  -- 開始日を計算
  start_date := (date_trunc('month', current_date_val) - (months_param - 1 || ' months')::interval)::date;
  
  -- 月ごとの売上データを取得
  RETURN QUERY
  WITH months AS (
    SELECT
      EXTRACT(YEAR FROM dt)::integer AS year,
      EXTRACT(MONTH FROM dt)::integer AS month
    FROM
      generate_series(
        start_date,
        date_trunc('month', current_date_val)::date,
        '1 month'::interval
      ) AS dt
  )
  SELECT
    m.year,
    m.month,
    to_char(to_date(m.month::text, 'MM'), 'Month') AS month_name,
    COALESCE(SUM(mp.total_revenue), 0) AS total_revenue,
    COALESCE(SUM(mp.owner_payout), 0) AS owner_payout
  FROM
    months m
  LEFT JOIN
    monthly_payouts mp ON mp.year = m.year AND mp.month = m.month AND mp.owner_id = owner_id_val
  GROUP BY
    m.year, m.month
  ORDER BY
    m.year, m.month;
END;
$$;

-- オーナーのドッグラン別売上を取得する関数
CREATE OR REPLACE FUNCTION get_owner_revenue_by_park(
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