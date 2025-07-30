-- クーポン再取得システム用のスキーマ拡張

-- 1. facility_couponsテーブルに新しいカラムを追加
ALTER TABLE facility_coupons 
ADD COLUMN IF NOT EXISTS original_id UUID,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_superseded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES facility_coupons(id);

-- 2. インデックスを追加
CREATE INDEX IF NOT EXISTS idx_facility_coupons_original_id ON facility_coupons(original_id);
CREATE INDEX IF NOT EXISTS idx_facility_coupons_version ON facility_coupons(version);
CREATE INDEX IF NOT EXISTS idx_facility_coupons_superseded ON facility_coupons(is_superseded);

-- 3. 既存データのoriginal_idを設定（初回のみ実行）
UPDATE facility_coupons 
SET original_id = id 
WHERE original_id IS NULL;

-- 4. クーポン編集時に新バージョンを作成するRPC関数
CREATE OR REPLACE FUNCTION create_new_coupon_version(
  p_coupon_id UUID,
  p_title VARCHAR(100),
  p_description TEXT,
  p_service_content TEXT,
  p_coupon_image_url TEXT,
  p_discount_value INTEGER,
  p_discount_type VARCHAR(20),
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE,
  p_usage_limit_type VARCHAR(20)
)
RETURNS JSON AS $$
DECLARE
  old_coupon facility_coupons%ROWTYPE;
  new_coupon_id UUID;
  new_version INTEGER;
BEGIN
  -- 既存クーポンの情報を取得
  SELECT * INTO old_coupon FROM facility_coupons WHERE id = p_coupon_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'クーポンが見つかりません');
  END IF;
  
  -- 新しいバージョン番号を計算
  SELECT COALESCE(MAX(version), 0) + 1 INTO new_version
  FROM facility_coupons 
  WHERE original_id = old_coupon.original_id OR (original_id IS NULL AND id = old_coupon.id);
  
  -- 新しいクーポンIDを生成
  new_coupon_id := gen_random_uuid();
  
  -- 古いクーポンを無効化
  UPDATE facility_coupons 
  SET 
    is_superseded = true,
    superseded_by = new_coupon_id,
    is_active = false,
    updated_at = NOW()
  WHERE id = p_coupon_id;
  
  -- 新しいクーポンを作成
  INSERT INTO facility_coupons (
    id,
    facility_id,
    title,
    description,
    service_content,
    coupon_image_url,
    discount_value,
    discount_type,
    start_date,
    end_date,
    usage_limit_type,
    max_uses,
    current_uses,
    is_active,
    original_id,
    version,
    is_superseded,
    created_at,
    updated_at
  ) VALUES (
    new_coupon_id,
    old_coupon.facility_id,
    p_title,
    p_description,
    p_service_content,
    p_coupon_image_url,
    p_discount_value,
    p_discount_type,
    p_start_date,
    p_end_date,
    p_usage_limit_type,
    CASE WHEN p_usage_limit_type = 'once' THEN 1 ELSE NULL END,
    0,
    true,
    COALESCE(old_coupon.original_id, old_coupon.id),
    new_version,
    false,
    NOW(),
    NOW()
  );
  
  RETURN json_build_object(
    'success', true,
    'new_coupon_id', new_coupon_id,
    'version', new_version,
    'message', 'クーポンの新バージョンが作成されました'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RLSポリシーの更新（supersededなクーポンを除外）
DROP POLICY IF EXISTS "Users can view active coupons" ON facility_coupons;
CREATE POLICY "Users can view active coupons" ON facility_coupons
  FOR SELECT USING (is_active = true AND is_superseded = false);

-- 6. アクティブなクーポンのみを取得するビューを作成
CREATE OR REPLACE VIEW active_facility_coupons AS
SELECT *
FROM facility_coupons
WHERE is_active = true AND is_superseded = false;

-- 7. コメント追加
COMMENT ON COLUMN facility_coupons.original_id IS 'オリジナルクーポンのID（バージョン管理用）';
COMMENT ON COLUMN facility_coupons.version IS 'クーポンのバージョン番号';
COMMENT ON COLUMN facility_coupons.is_superseded IS 'このクーポンが新しいバージョンに置き換えられたかどうか';
COMMENT ON COLUMN facility_coupons.superseded_by IS '置き換え後の新しいクーポンのID';

-- 8. 確認用クエリ
SELECT 
  'クーポンバージョン管理システム作成完了' as message,
  COUNT(*) as total_coupons,
  COUNT(CASE WHEN is_superseded = false THEN 1 END) as active_coupons,
  COUNT(CASE WHEN is_superseded = true THEN 1 END) as superseded_coupons
FROM facility_coupons; 