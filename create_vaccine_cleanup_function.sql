-- ワクチン証明書の自動削除機能
-- 一時保存されたワクチン証明書を定期的に削除する

-- 1. 期限切れのワクチン証明書を削除する関数
CREATE OR REPLACE FUNCTION cleanup_expired_vaccine_certificates()
RETURNS void AS $$
BEGIN
    -- 30日以上経過した一時保存のワクチン証明書を削除
    DELETE FROM vaccine_certifications
    WHERE temp_storage = true
    AND status = 'pending'
    AND created_at < NOW() - INTERVAL '30 days';
    
    -- ログに記録
    INSERT INTO admin_logs (action, details, created_at)
    VALUES ('cleanup_expired_vaccines', 'Cleaned up expired vaccine certificates', NOW());
END;
$$ LANGUAGE plpgsql;

-- 2. 管理者ログテーブルの作成（存在しない場合）
CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 確認用のクエリ関数
CREATE OR REPLACE FUNCTION get_vaccine_storage_stats()
RETURNS TABLE(
    total_vaccines INTEGER,
    pending_vaccines INTEGER,
    approved_vaccines INTEGER,
    rejected_vaccines INTEGER,
    temp_storage_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_vaccines,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::INTEGER as pending_vaccines,
        COUNT(CASE WHEN status = 'approved' THEN 1 END)::INTEGER as approved_vaccines,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END)::INTEGER as rejected_vaccines,
        COUNT(CASE WHEN temp_storage = true THEN 1 END)::INTEGER as temp_storage_count
    FROM vaccine_certifications;
END;
$$ LANGUAGE plpgsql;

-- 4. 関数の確認
SELECT 'Vaccine cleanup functions created successfully' as status;

-- 5. 現在のワクチン証明書統計を表示
SELECT * FROM get_vaccine_storage_stats(); 