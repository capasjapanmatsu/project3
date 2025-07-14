-- Create maintenance table
CREATE TABLE IF NOT EXISTS public.maintenance_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    is_active BOOLEAN DEFAULT FALSE,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    is_emergency BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create RLS policies
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- 管理者のみ読み取り・書き込み可能
CREATE POLICY "maintenance_admin_select" ON public.maintenance_schedules
    FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.user_type = 'admin'
        )
    );

CREATE POLICY "maintenance_admin_insert" ON public.maintenance_schedules
    FOR INSERT 
    TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.user_type = 'admin'
        )
    );

CREATE POLICY "maintenance_admin_update" ON public.maintenance_schedules
    FOR UPDATE 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.user_type = 'admin'
        )
    );

CREATE POLICY "maintenance_admin_delete" ON public.maintenance_schedules
    FOR DELETE 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.user_type = 'admin'
        )
    );

-- 一般ユーザーは現在有効なメンテナンス情報のみ閲覧可能
CREATE POLICY "maintenance_public_select" ON public.maintenance_schedules
    FOR SELECT 
    TO authenticated 
    USING (
        is_active = TRUE
    );

-- 現在有効なメンテナンスを取得する関数
CREATE OR REPLACE FUNCTION get_current_maintenance()
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    message TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    is_emergency BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.title,
        m.message,
        m.start_time,
        m.end_time,
        m.is_emergency
    FROM public.maintenance_schedules m
    WHERE m.is_active = TRUE
    ORDER BY m.created_at DESC
    LIMIT 1;
END;
$$;

-- 更新トリガー
CREATE OR REPLACE FUNCTION update_maintenance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_maintenance_updated_at
    BEFORE UPDATE ON public.maintenance_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_updated_at();

-- 初期データ（現在は非アクティブ）
INSERT INTO public.maintenance_schedules (
    title, 
    message, 
    is_active, 
    is_emergency
) VALUES (
    'システムメンテナンス',
    'より良いサービス提供のため、システムメンテナンスを実施しています。ご不便をおかけして申し訳ございません。',
    FALSE,
    FALSE
); 