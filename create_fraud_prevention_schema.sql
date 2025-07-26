-- 悪質ユーザー対策用テーブル群

-- 1. デバイスフィンガープリント記録テーブル
CREATE TABLE IF NOT EXISTS user_device_fingerprints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    fingerprint TEXT NOT NULL,
    user_agent TEXT,
    screen_resolution TEXT,
    timezone TEXT,
    language TEXT,
    platform TEXT,
    cookie_enabled BOOLEAN DEFAULT true,
    action_type TEXT CHECK (action_type IN ('registration', 'login', 'subscription')),
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_user_id ON user_device_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_fingerprint ON user_device_fingerprints(fingerprint);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_ip_address ON user_device_fingerprints(ip_address);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_created_at ON user_device_fingerprints(created_at);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_action_type ON user_device_fingerprints(action_type);

-- 2. Stripeカード情報の追跡テーブル
CREATE TABLE IF NOT EXISTS stripe_card_fingerprints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    card_fingerprint TEXT NOT NULL, -- Stripeのcard fingerprint
    card_last4 TEXT,
    card_brand TEXT,
    card_country TEXT,
    trial_used BOOLEAN DEFAULT false,
    trial_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_card_fingerprints_user_id ON stripe_card_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_card_fingerprints_card_fingerprint ON stripe_card_fingerprints(card_fingerprint);
CREATE INDEX IF NOT EXISTS idx_card_fingerprints_trial_used ON stripe_card_fingerprints(trial_used);

-- 3. 不正利用検知ログテーブル
CREATE TABLE IF NOT EXISTS fraud_detection_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    detection_type TEXT CHECK (detection_type IN ('duplicate_device', 'duplicate_ip', 'duplicate_card', 'suspicious_pattern')),
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    details JSONB,
    action_taken TEXT CHECK (action_taken IN ('none', 'warning', 'restriction', 'ban')),
    admin_reviewed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_fraud_logs_user_id ON fraud_detection_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_logs_detection_type ON fraud_detection_logs(detection_type);
CREATE INDEX IF NOT EXISTS idx_fraud_logs_risk_score ON fraud_detection_logs(risk_score);
CREATE INDEX IF NOT EXISTS idx_fraud_logs_admin_reviewed ON fraud_detection_logs(admin_reviewed);

-- 4. IP制限テーブル
CREATE TABLE IF NOT EXISTS ip_restrictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address INET NOT NULL,
    restriction_type TEXT CHECK (restriction_type IN ('warning', 'limited', 'banned')),
    reason TEXT,
    registration_count INTEGER DEFAULT 0,
    last_registration_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_ip_restrictions_ip_address ON ip_restrictions(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_restrictions_restriction_type ON ip_restrictions(restriction_type);
CREATE INDEX IF NOT EXISTS idx_ip_restrictions_expires_at ON ip_restrictions(expires_at);

-- RLS (Row Level Security) ポリシー設定

-- user_device_fingerprints
ALTER TABLE user_device_fingerprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own device fingerprints" ON user_device_fingerprints
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own device fingerprints" ON user_device_fingerprints
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 管理者のみ全データを参照可能
CREATE POLICY "Admins can view all device fingerprints" ON user_device_fingerprints
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- stripe_card_fingerprints
ALTER TABLE stripe_card_fingerprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own card fingerprints" ON stripe_card_fingerprints
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage card fingerprints" ON stripe_card_fingerprints
    FOR ALL USING (true); -- サービスロール用

-- fraud_detection_logs
ALTER TABLE fraud_detection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all fraud logs" ON fraud_detection_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ip_restrictions
ALTER TABLE ip_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage IP restrictions" ON ip_restrictions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 自動更新のトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガー作成
CREATE TRIGGER update_device_fingerprints_updated_at 
    BEFORE UPDATE ON user_device_fingerprints 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_card_fingerprints_updated_at 
    BEFORE UPDATE ON stripe_card_fingerprints 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ip_restrictions_updated_at 
    BEFORE UPDATE ON ip_restrictions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 不正検知関数（プロシージャ）
CREATE OR REPLACE FUNCTION detect_potential_fraud(
    p_user_id UUID,
    p_fingerprint TEXT,
    p_ip_address INET DEFAULT NULL
)
RETURNS TABLE (
    is_suspicious BOOLEAN,
    risk_score INTEGER,
    reasons TEXT[]
) AS $$
DECLARE
    device_count INTEGER := 0;
    ip_count INTEGER := 0;
    risk INTEGER := 0;
    reason_list TEXT[] := '{}';
BEGIN
    -- デバイス重複チェック
    SELECT COUNT(DISTINCT user_id) INTO device_count
    FROM user_device_fingerprints 
    WHERE fingerprint = p_fingerprint AND action_type = 'registration';
    
    IF device_count > 1 THEN
        risk := risk + 30;
        reason_list := array_append(reason_list, 'duplicate_device');
    END IF;
    
    -- IP重複チェック（24時間以内）
    IF p_ip_address IS NOT NULL THEN
        SELECT COUNT(DISTINCT user_id) INTO ip_count
        FROM user_device_fingerprints 
        WHERE ip_address = p_ip_address 
        AND action_type = 'registration'
        AND created_at > now() - interval '24 hours';
        
        IF ip_count > 2 THEN
            risk := risk + 25;
            reason_list := array_append(reason_list, 'duplicate_ip_24h');
        END IF;
    END IF;
    
    -- 結果を返す
    RETURN QUERY SELECT 
        risk >= 30 as is_suspicious,
        risk as risk_score,
        reason_list as reasons;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 