-- maintenance_schedulesテーブルを作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    park_id uuid NOT NULL REFERENCES dog_parks(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    start_date timestamptz NOT NULL,
    end_date timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
    is_emergency boolean NOT NULL DEFAULT false,
    notify_users boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_park_id ON maintenance_schedules(park_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_status ON maintenance_schedules(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_dates ON maintenance_schedules(start_date, end_date);

-- RLSを有効化
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- RLSポリシーを作成
DROP POLICY IF EXISTS "Users can view maintenance schedules for their parks" ON maintenance_schedules;
CREATE POLICY "Users can view maintenance schedules for their parks" ON maintenance_schedules
    FOR SELECT USING (
        park_id IN (
            SELECT id FROM dog_parks WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert maintenance schedules for their parks" ON maintenance_schedules;
CREATE POLICY "Users can insert maintenance schedules for their parks" ON maintenance_schedules
    FOR INSERT WITH CHECK (
        park_id IN (
            SELECT id FROM dog_parks WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update maintenance schedules for their parks" ON maintenance_schedules;
CREATE POLICY "Users can update maintenance schedules for their parks" ON maintenance_schedules
    FOR UPDATE USING (
        park_id IN (
            SELECT id FROM dog_parks WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete maintenance schedules for their parks" ON maintenance_schedules;
CREATE POLICY "Users can delete maintenance schedules for their parks" ON maintenance_schedules
    FOR DELETE USING (
        park_id IN (
            SELECT id FROM dog_parks WHERE owner_id = auth.uid()
        )
    );

-- 成功メッセージ
SELECT 'maintenance_schedules table created successfully' as result;