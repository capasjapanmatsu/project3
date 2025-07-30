-- 無料プレゼント割引タイプを追加するスキーマ更新

-- 既存のCHECK制約を削除
ALTER TABLE facility_coupons
DROP CONSTRAINT IF EXISTS valid_discount;

-- 新しいCHECK制約を追加（無料プレゼントを含む）
ALTER TABLE facility_coupons
ADD CONSTRAINT valid_discount CHECK (
    (discount_type = 'amount' AND discount_value > 0) OR
    (discount_type = 'percentage' AND discount_value > 0 AND discount_value <= 100) OR
    (discount_type = 'free_gift' AND (discount_value IS NULL OR discount_value = 0))
);

-- コメントを更新
COMMENT ON COLUMN facility_coupons.discount_type IS 
'Discount type: amount (金額), percentage (割引率), free_gift (無料プレゼント)';

COMMENT ON COLUMN facility_coupons.discount_value IS 
'Discount value in yen for amount type, percentage for percentage type, null or 0 for free_gift type'; 