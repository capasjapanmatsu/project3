-- クーポンシステム用テーブル作成SQL

-- 1. 施設クーポンテーブル
CREATE TABLE IF NOT EXISTS facility_coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id UUID NOT NULL REFERENCES pet_facilities(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    service_content TEXT NOT NULL,
    coupon_image_url TEXT,
    discount_value INTEGER, -- 割引金額（円）または割引率（%）
    discount_type VARCHAR(20) DEFAULT 'amount', -- 'amount'（金額） または 'percentage'（割引率）
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    usage_limit_type VARCHAR(20) DEFAULT 'unlimited', -- 'once'（1回限り） または 'unlimited'（何回でも）
    max_uses INTEGER, -- 最大使用回数（usage_limit_type='once'の場合は1）
    current_uses INTEGER DEFAULT 0, -- 現在の使用回数
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_dates CHECK (end_date > start_date),
    CONSTRAINT valid_discount CHECK (
        (discount_type = 'amount' AND discount_value > 0) OR
        (discount_type = 'percentage' AND discount_value > 0 AND discount_value <= 100)
    ),
    CONSTRAINT valid_usage_limit CHECK (
        (usage_limit_type = 'once' AND max_uses = 1) OR
        (usage_limit_type = 'unlimited' AND max_uses IS NULL)
    )
);

-- 2. ユーザークーポン取得・使用履歴テーブル
CREATE TABLE IF NOT EXISTS user_coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    coupon_id UUID NOT NULL REFERENCES facility_coupons(id) ON DELETE CASCADE,
    obtained_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE,
    is_used BOOLEAN DEFAULT false,
    qr_code_token VARCHAR(255) UNIQUE, -- QRコード用のユニークトークン
    
    -- 同じユーザーが同じクーポンを複数取得することを防ぐ（1回限りクーポンの場合）
    UNIQUE(user_id, coupon_id)
);

-- 3. インデックス作成
CREATE INDEX IF NOT EXISTS idx_facility_coupons_facility_id ON facility_coupons(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_coupons_active ON facility_coupons(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_coupon_id ON user_coupons(coupon_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_used ON user_coupons(is_used);

-- 4. RLS (Row Level Security) ポリシー設定
ALTER TABLE facility_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;

-- 施設クーポンのRLSポリシー
CREATE POLICY "Facility owners can manage their coupons" ON facility_coupons
    FOR ALL USING (
        facility_id IN (
            SELECT id FROM pet_facilities WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Everyone can view active coupons" ON facility_coupons
    FOR SELECT USING (
        is_active = true AND 
        start_date <= NOW() AND 
        end_date >= NOW()
    );

-- ユーザークーポンのRLSポリシー
CREATE POLICY "Users can manage their own coupons" ON user_coupons
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Facility owners can view their coupon usage" ON user_coupons
    FOR SELECT USING (
        coupon_id IN (
            SELECT fc.id FROM facility_coupons fc
            JOIN pet_facilities pf ON fc.facility_id = pf.id
            WHERE pf.owner_id = auth.uid()
        )
    );

-- 5. クーポン統計用のRPC関数
CREATE OR REPLACE FUNCTION get_coupon_stats(coupon_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_obtained', COUNT(*),
        'total_used', COUNT(*) FILTER (WHERE is_used = true),
        'usage_rate', CASE 
            WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE is_used = true)::DECIMAL / COUNT(*)) * 100, 2)
            ELSE 0
        END
    ) INTO result
    FROM user_coupons
    WHERE coupon_id = coupon_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. クーポン取得用のRPC関数
CREATE OR REPLACE FUNCTION obtain_coupon(p_coupon_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    coupon_record facility_coupons%ROWTYPE;
    user_coupon_record user_coupons%ROWTYPE;
    qr_token VARCHAR(255);
BEGIN
    -- クーポンの存在確認と有効性チェック
    SELECT * INTO coupon_record
    FROM facility_coupons
    WHERE id = p_coupon_id
        AND is_active = true
        AND start_date <= NOW()
        AND end_date >= NOW();
    
    IF NOT FOUND THEN
        RETURN 'coupon_not_found';
    END IF;
    
    -- 期限切れチェック
    IF coupon_record.end_date < NOW() THEN
        RETURN 'coupon_expired';
    END IF;
    
    -- アクティブ状態チェック
    IF NOT coupon_record.is_active THEN
        RETURN 'coupon_inactive';
    END IF;
    
    -- 既に取得済みかチェック
    SELECT * INTO user_coupon_record
    FROM user_coupons
    WHERE user_id = p_user_id AND coupon_id = p_coupon_id;
    
    IF FOUND THEN
        RETURN 'already_obtained';
    END IF;
    
    -- QRコード用のユニークトークン生成
    qr_token := encode(gen_random_bytes(32), 'hex');
    
    -- クーポン取得レコード作成
    INSERT INTO user_coupons (user_id, coupon_id, qr_code_token)
    VALUES (p_user_id, p_coupon_id, qr_token);
    
    RETURN 'success';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. クーポン使用用のRPC関数
CREATE OR REPLACE FUNCTION use_coupon(qr_token_param VARCHAR(255))
RETURNS JSON AS $$
DECLARE
    user_coupon_record user_coupons%ROWTYPE;
    coupon_record facility_coupons%ROWTYPE;
BEGIN
    -- QRトークンでクーポン検索
    SELECT * INTO user_coupon_record
    FROM user_coupons
    WHERE qr_code_token = qr_token_param AND is_used = false;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'クーポンが見つからないか、既に使用済みです。');
    END IF;
    
    -- クーポン情報取得
    SELECT * INTO coupon_record
    FROM facility_coupons
    WHERE id = user_coupon_record.coupon_id;
    
    -- 有効期限チェック
    IF coupon_record.end_date < NOW() THEN
        RETURN json_build_object('success', false, 'error', 'クーポンの有効期限が切れています。');
    END IF;
    
    -- クーポン使用処理
    UPDATE user_coupons
    SET is_used = true, used_at = NOW()
    WHERE id = user_coupon_record.id;
    
    -- 使用回数更新
    UPDATE facility_coupons
    SET current_uses = current_uses + 1
    WHERE id = coupon_record.id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'クーポンを使用しました！',
        'coupon_title', coupon_record.title,
        'service_content', coupon_record.service_content
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 