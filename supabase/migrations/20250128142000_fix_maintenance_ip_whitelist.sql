-- Fix maintenance database functions and IP whitelist

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

-- Enable RLS
ALTER TABLE public.ip_whitelist ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "ip_whitelist_admin_select" ON public.ip_whitelist;
CREATE POLICY "ip_whitelist_admin_select" ON public.ip_whitelist
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.user_type = 'admin'
        )
    );

DROP POLICY IF EXISTS "ip_whitelist_admin_insert" ON public.ip_whitelist;
CREATE POLICY "ip_whitelist_admin_insert" ON public.ip_whitelist
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.user_type = 'admin'
        )
    );

DROP POLICY IF EXISTS "ip_whitelist_admin_update" ON public.ip_whitelist;
CREATE POLICY "ip_whitelist_admin_update" ON public.ip_whitelist
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.user_type = 'admin'
        )
    );

DROP POLICY IF EXISTS "ip_whitelist_admin_delete" ON public.ip_whitelist;
CREATE POLICY "ip_whitelist_admin_delete" ON public.ip_whitelist
    FOR DELETE TO authenticated USING (
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

-- デフォルトのホワイトリストエントリを追加（既存の場合は無視）
INSERT INTO public.ip_whitelist (ip_address, description, is_active) 
SELECT '127.0.0.1/32', 'localhost', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.ip_whitelist WHERE ip_address = '127.0.0.1/32');

INSERT INTO public.ip_whitelist (ip_address, description, is_active) 
SELECT '::1/128', 'localhost IPv6', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.ip_whitelist WHERE ip_address = '::1/128');

INSERT INTO public.ip_whitelist (ip_address, description, is_active) 
SELECT '192.168.0.0/16', 'Private Network (192.168.x.x)', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.ip_whitelist WHERE ip_address = '192.168.0.0/16');

INSERT INTO public.ip_whitelist (ip_address, description, is_active) 
SELECT '10.0.0.0/8', 'Private Network (10.x.x.x)', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.ip_whitelist WHERE ip_address = '10.0.0.0/8');

INSERT INTO public.ip_whitelist (ip_address, description, is_active) 
SELECT '172.16.0.0/12', 'Private Network (172.16-31.x.x)', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.ip_whitelist WHERE ip_address = '172.16.0.0/12');

-- 現在のIPアドレス（125.198.193.26）を管理者用として追加
INSERT INTO public.ip_whitelist (ip_address, description, is_active) 
SELECT '125.198.193.26/32', '管理者IPアドレス', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.ip_whitelist WHERE ip_address = '125.198.193.26/32'); 