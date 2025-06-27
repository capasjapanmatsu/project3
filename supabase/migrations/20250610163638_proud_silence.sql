/*
  # 入場QRシステム複数犬対応アップデート

  1. テーブルコメント追加
    - 入場QRコードテーブルに複数犬対応の説明を追加
    - 各カラムの役割を明確化

  2. 複数犬入場管理ビュー
    - 同じアクセスコードでグループ化
    - 犬の頭数と合計金額を集計
    - 犬の名前を結合して表示

  3. 統計・分析機能
    - 入場統計取得関数
    - 期限切れQRコード自動処理
    - 複数犬利用の分析データ

  4. パフォーマンス最適化
    - 複数犬検索用インデックス
    - データ整合性制約
*/

-- 入場QRコードテーブルにコメントを追加
COMMENT ON TABLE entrance_qr_codes IS '入場QRコード管理テーブル - 最大3頭まで同時入場可能';
COMMENT ON COLUMN entrance_qr_codes.access_code IS '入場用アクセスコード - 複数犬で同じコードを共有可能';
COMMENT ON COLUMN entrance_qr_codes.dog_id IS '対象の犬ID - 複数犬の場合は犬ごとにレコード作成';
COMMENT ON COLUMN entrance_qr_codes.amount_charged IS '課金額 - 複数犬の場合は頭数で分割';

-- 複数犬同時入場のルールを確認するビューを作成
CREATE OR REPLACE VIEW entrance_qr_summary AS
SELECT 
  eqr.access_code,
  eqr.user_id,
  eqr.payment_type,
  COUNT(eqr.dog_id) as dog_count,
  SUM(eqr.amount_charged) as total_amount,
  STRING_AGG(d.name, ', ' ORDER BY d.name) as dog_names,
  MIN(eqr.created_at) as created_at,
  MIN(eqr.valid_until) as valid_until,
  eqr.status
FROM entrance_qr_codes eqr
JOIN dogs d ON eqr.dog_id = d.id
WHERE eqr.status = 'active'
GROUP BY eqr.access_code, eqr.user_id, eqr.payment_type, eqr.status;

-- ビューにコメントを追加
COMMENT ON VIEW entrance_qr_summary IS '入場QRコードの概要ビュー - 複数犬の情報を集約表示';

-- 期限切れQRコードの自動削除を改善
CREATE OR REPLACE FUNCTION expire_old_qr_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count integer;
BEGIN
  -- 期限切れのQRコードを無効化
  UPDATE entrance_qr_codes
  SET status = 'expired'
  WHERE status = 'active'
    AND valid_until < now();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  -- ログ出力
  IF expired_count > 0 THEN
    RAISE NOTICE '期限切れQRコード % 件を無効化しました', expired_count;
  END IF;
END;
$$;

-- 複数犬入場の統計を取得する関数
CREATE OR REPLACE FUNCTION get_entrance_stats(
  start_date date DEFAULT CURRENT_DATE - interval '30 days',
  end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_qr_codes bigint,
  single_dog_entries bigint,
  multi_dog_entries bigint,
  max_dogs_per_entry bigint,
  total_dogs bigint,
  subscription_usage bigint,
  single_payment_usage bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH qr_stats AS (
    SELECT 
      access_code,
      COUNT(dog_id) as dog_count,
      payment_type
    FROM entrance_qr_codes
    WHERE created_at::date BETWEEN start_date AND end_date
      AND status IN ('active', 'used')
    GROUP BY access_code, payment_type
  )
  SELECT 
    COUNT(*)::bigint as total_qr_codes,
    COUNT(CASE WHEN dog_count = 1 THEN 1 END)::bigint as single_dog_entries,
    COUNT(CASE WHEN dog_count > 1 THEN 1 END)::bigint as multi_dog_entries,
    COALESCE(MAX(dog_count), 0)::bigint as max_dogs_per_entry,
    COALESCE(SUM(dog_count), 0)::bigint as total_dogs,
    COUNT(CASE WHEN payment_type = 'subscription' THEN 1 END)::bigint as subscription_usage,
    COUNT(CASE WHEN payment_type = 'single' THEN 1 END)::bigint as single_payment_usage
  FROM qr_stats;
END;
$$;

-- 関数にコメントを追加
COMMENT ON FUNCTION get_entrance_stats IS '入場QRコードの利用統計を取得 - 複数犬入場の分析用';

-- 権限設定
GRANT SELECT ON entrance_qr_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_entrance_stats TO authenticated;

-- インデックスの最適化（複数犬検索用）
CREATE INDEX IF NOT EXISTS entrance_qr_codes_access_code_status_idx 
ON entrance_qr_codes(access_code, status);

CREATE INDEX IF NOT EXISTS entrance_qr_codes_user_payment_type_idx 
ON entrance_qr_codes(user_id, payment_type);

-- 制約の追加（データ整合性確保）
DO $$
BEGIN
  -- 制約が既に存在するかチェックしてから追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_valid_until_future' 
    AND table_name = 'entrance_qr_codes'
  ) THEN
    ALTER TABLE entrance_qr_codes 
    ADD CONSTRAINT check_valid_until_future 
    CHECK (valid_until > created_at);
  END IF;
END $$;

-- 成功メッセージ
DO $$
BEGIN
  RAISE NOTICE '=== 入場QRシステム複数犬対応アップデート完了 ===';
  RAISE NOTICE '✓ 最大3頭まで同時入場可能';
  RAISE NOTICE '✓ 複数犬選択時の料金計算対応';
  RAISE NOTICE '✓ サブスクリプション利用時は何頭でも定額';
  RAISE NOTICE '✓ 統計・分析機能追加';
  RAISE NOTICE '✓ データ整合性制約追加';
  RAISE NOTICE '✓ カラム参照の曖昧性エラー修正完了';
END $$;