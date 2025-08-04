-- maintenance_schedulesテーブルをシンプルに作成
CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    park_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    start_date timestamptz NOT NULL,
    end_date timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'scheduled',
    is_emergency boolean NOT NULL DEFAULT false,
    notify_users boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_park_id ON maintenance_schedules(park_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_status ON maintenance_schedules(status);

-- RLSを有効化
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- 基本的なRLSポリシーを作成
CREATE POLICY IF NOT EXISTS "Enable all for authenticated users" ON maintenance_schedules
    FOR ALL USING (auth.role() = 'authenticated');

-- 成功メッセージ
SELECT 'maintenance_schedules table created successfully' as result;