-- Create IP whitelist table
CREATE TABLE IF NOT EXISTS public.ip_whitelist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address CIDR NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create RLS policies
ALTER TABLE public.ip_whitelist ENABLE ROW LEVEL SECURITY;

-- 管理者のみ読み取り・書き込み可能
CREATE POLICY "ip_whitelist_admin_select" ON public.ip_whitelist
    FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.user_type = 'admin'
        )
    );

CREATE POLICY "ip_whitelist_admin_insert" ON public.ip_whitelist
    FOR INSERT 
    TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.user_type = 'admin'
        )
    );

CREATE POLICY "ip_whitelist_admin_update" ON public.ip_whitelist
    FOR UPDATE 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.user_type = 'admin'
        )
    );

CREATE POLICY "ip_whitelist_admin_delete" ON public.ip_whitelist
    FOR DELETE 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.user_type = 'admin'
        )
    );

-- IPアドレスがホワイトリストに含まれているかチェックする関数
CREATE OR REPLACE FUNCTION is_ip_whitelisted(check_ip TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.ip_whitelist 
        WHERE is_active = TRUE 
        AND inet(check_ip) <<= ip_address
    );
END;
$$;

-- 更新トリガー
CREATE OR REPLACE FUNCTION update_ip_whitelist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ip_whitelist_updated_at
    BEFORE UPDATE ON public.ip_whitelist
    FOR EACH ROW
    EXECUTE FUNCTION update_ip_whitelist_updated_at();

-- デフォルトのホワイトリストエントリを追加
INSERT INTO public.ip_whitelist (ip_address, description, is_active) VALUES
('127.0.0.1/32', 'localhost', TRUE),
('::1/128', 'localhost IPv6', TRUE),
('192.168.0.0/16', 'Private Network (192.168.x.x)', TRUE),
('10.0.0.0/8', 'Private Network (10.x.x.x)', TRUE),
('172.16.0.0/12', 'Private Network (172.16-31.x.x)', TRUE);

-- メンテナンス状態とIPホワイトリストを考慮した関数
CREATE OR REPLACE FUNCTION should_show_maintenance(client_ip TEXT)
RETURNS TABLE (
    is_maintenance_active BOOLEAN,
    maintenance_info JSONB,
    is_ip_allowed BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    maintenance_record RECORD;
    is_whitelisted BOOLEAN;
BEGIN
    -- メンテナンス状態を取得
    SELECT m.* INTO maintenance_record
    FROM public.maintenance_schedules m
    WHERE m.is_active = TRUE
    ORDER BY m.created_at DESC
    LIMIT 1;
    
    -- IPホワイトリストチェック
    SELECT is_ip_whitelisted(client_ip) INTO is_whitelisted;
    
    -- 結果を返す
    RETURN QUERY
    SELECT 
        (maintenance_record.id IS NOT NULL) as is_maintenance_active,
        CASE 
            WHEN maintenance_record.id IS NOT NULL THEN
                jsonb_build_object(
                    'id', maintenance_record.id,
                    'title', maintenance_record.title,
                    'message', maintenance_record.message,
                    'start_time', maintenance_record.start_time,
                    'end_time', maintenance_record.end_time,
                    'is_emergency', maintenance_record.is_emergency
                )
            ELSE NULL
        END as maintenance_info,
        is_whitelisted as is_ip_allowed;
END;
$$; 