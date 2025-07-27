-- サブスクリプション関連のデータベース修正スクリプト
-- Stripe User Subscriptionsテーブルにstatusカラムを追加し、関連テーブルを作成

-- 1. stripe_user_subscriptionsテーブルのstatus列追加（存在しない場合）
DO $$
BEGIN
    -- Check if status column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stripe_user_subscriptions' 
        AND column_name = 'status'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE stripe_user_subscriptions 
        ADD COLUMN status VARCHAR(50) DEFAULT 'active';
        
        RAISE NOTICE 'status列をstripe_user_subscriptionsテーブルに追加しました';
    ELSE
        RAISE NOTICE 'status列は既に存在します';
    END IF;
END $$;

-- 2. user_device_fingerprintsテーブル作成（デバイス識別用）
CREATE TABLE IF NOT EXISTS user_device_fingerprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_fingerprint TEXT NOT NULL,
    fingerprint_hash VARCHAR(64) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    screen_resolution VARCHAR(20),
    timezone VARCHAR(50),
    language VARCHAR(10),
    platform VARCHAR(50),
    is_blocked BOOLEAN DEFAULT FALSE,
    fraud_score INTEGER DEFAULT 0,
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_user_device_fingerprints_user_id 
ON user_device_fingerprints(user_id);

CREATE INDEX IF NOT EXISTS idx_user_device_fingerprints_hash 
ON user_device_fingerprints(fingerprint_hash);

CREATE INDEX IF NOT EXISTS idx_user_device_fingerprints_ip 
ON user_device_fingerprints(ip_address);

-- 3. device_usage_logsテーブル作成（使用履歴追跡用）
CREATE TABLE IF NOT EXISTS device_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_fingerprint_id UUID REFERENCES user_device_fingerprints(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'login', 'subscription_attempt', 'payment', etc.
    ip_address INET,
    success BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_device_usage_logs_user_id 
ON device_usage_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_device_usage_logs_action 
ON device_usage_logs(action_type, created_at DESC);

-- 4. fraud_detection_logsテーブル作成（不正検出ログ用）
CREATE TABLE IF NOT EXISTS fraud_detection_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_fingerprint_id UUID REFERENCES user_device_fingerprints(id) ON DELETE CASCADE,
    detection_type VARCHAR(50) NOT NULL, -- 'duplicate_device', 'rapid_registration', 'suspicious_pattern'
    risk_level VARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
    description TEXT,
    evidence JSONB,
    action_taken VARCHAR(50), -- 'blocked', 'flagged', 'allowed'
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_fraud_logs_user_id 
ON fraud_detection_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fraud_logs_risk_level 
ON fraud_detection_logs(risk_level, created_at DESC);

-- 5. RLS（Row Level Security）ポリシー設定

-- user_device_fingerprints
ALTER TABLE user_device_fingerprints ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のデバイス情報のみ参照可能
CREATE POLICY "Users can view own device fingerprints" ON user_device_fingerprints
    FOR SELECT USING (auth.uid() = user_id);

-- 管理者は全てのデバイス情報にアクセス可能
CREATE POLICY "Admins can view all device fingerprints" ON user_device_fingerprints
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- サービスは挿入・更新可能（認証済みユーザーのみ）
CREATE POLICY "Authenticated users can insert device fingerprints" ON user_device_fingerprints
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own device fingerprints" ON user_device_fingerprints
    FOR UPDATE USING (auth.uid() = user_id);

-- device_usage_logs
ALTER TABLE device_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage logs" ON device_usage_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all usage logs" ON device_usage_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Authenticated users can insert usage logs" ON device_usage_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- fraud_detection_logs
ALTER TABLE fraud_detection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fraud logs" ON fraud_detection_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 6. 便利なビュー作成

-- 高リスクユーザー一覧ビュー
CREATE OR REPLACE VIEW high_risk_users AS
SELECT 
    u.id as user_id,
    u.email,
    p.name,
    COUNT(DISTINCT df.id) as device_count,
    COUNT(fdl.id) as fraud_incidents,
    MAX(fdl.risk_level) as max_risk_level,
    MAX(fdl.created_at) as last_incident,
    CASE 
        WHEN COUNT(fdl.id) >= 3 THEN 'critical'
        WHEN COUNT(fdl.id) >= 2 THEN 'high'
        WHEN COUNT(fdl.id) >= 1 THEN 'medium'
        ELSE 'low'
    END as overall_risk
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN user_device_fingerprints df ON u.id = df.user_id
LEFT JOIN fraud_detection_logs fdl ON u.id = fdl.user_id
GROUP BY u.id, u.email, p.name
HAVING COUNT(fdl.id) > 0 OR COUNT(DISTINCT df.id) > 2
ORDER BY COUNT(fdl.id) DESC, COUNT(DISTINCT df.id) DESC;

-- デバイス使用統計ビュー
CREATE OR REPLACE VIEW device_usage_stats AS
SELECT 
    df.fingerprint_hash,
    df.platform,
    COUNT(DISTINCT df.user_id) as unique_users,
    COUNT(dul.id) as total_actions,
    MAX(dul.created_at) as last_used,
    MIN(df.first_seen_at) as first_seen,
    CASE 
        WHEN COUNT(DISTINCT df.user_id) > 5 THEN 'high_risk'
        WHEN COUNT(DISTINCT df.user_id) > 2 THEN 'medium_risk'
        ELSE 'normal'
    END as risk_assessment
FROM user_device_fingerprints df
LEFT JOIN device_usage_logs dul ON df.id = dul.device_fingerprint_id
GROUP BY df.fingerprint_hash, df.platform
ORDER BY unique_users DESC, total_actions DESC;

-- 7. 通知用の設定

-- 管理者通知トリガー（高リスク検出時）
CREATE OR REPLACE FUNCTION notify_admin_fraud_detection()
RETURNS TRIGGER AS $$
BEGIN
    -- 高リスクまたは重要な検出の場合、管理者に通知
    IF NEW.risk_level IN ('high', 'critical') THEN
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            created_at,
            read
        )
        SELECT 
            id,
            '不正行為検出アラート',
            '高リスクな不正行為が検出されました。管理画面で詳細をご確認ください。',
            'fraud_alert',
            NOW(),
            false
        FROM profiles 
        WHERE role = 'admin';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
DROP TRIGGER IF EXISTS fraud_detection_notification ON fraud_detection_logs;
CREATE TRIGGER fraud_detection_notification
    AFTER INSERT ON fraud_detection_logs
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_fraud_detection();

COMMENT ON TABLE user_device_fingerprints IS 'ユーザーデバイスの識別情報を保存';
COMMENT ON TABLE device_usage_logs IS 'デバイス使用履歴を記録';
COMMENT ON TABLE fraud_detection_logs IS '不正検出ログを保存';
COMMENT ON VIEW high_risk_users IS '高リスクユーザーの一覧表示';
COMMENT ON VIEW device_usage_stats IS 'デバイス使用統計情報';

-- 完了メッセージ
DO $$
BEGIN
    RAISE NOTICE '=================================';
    RAISE NOTICE 'サブスクリプション関連テーブル修正完了';
    RAISE NOTICE '- stripe_user_subscriptions.status 追加';
    RAISE NOTICE '- user_device_fingerprints テーブル作成';
    RAISE NOTICE '- device_usage_logs テーブル作成'; 
    RAISE NOTICE '- fraud_detection_logs テーブル作成';
    RAISE NOTICE '- RLSポリシー設定完了';
    RAISE NOTICE '- 便利なビュー作成完了';
    RAISE NOTICE '=================================';
END $$; 