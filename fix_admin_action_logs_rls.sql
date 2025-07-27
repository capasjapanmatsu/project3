-- admin_action_logsテーブルのRLS設定を修正

-- 1. テーブルが存在する場合、RLSを有効化
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_action_logs') THEN
        ALTER TABLE admin_action_logs ENABLE ROW LEVEL SECURITY;
        
        -- 既存のポリシーを削除
        DROP POLICY IF EXISTS "admin_action_logs_admin_access" ON admin_action_logs;
        DROP POLICY IF EXISTS "admin_action_logs_super_admin_access" ON admin_action_logs;
        
        -- 管理者のみアクセス可能なポリシーを作成
        CREATE POLICY "admin_action_logs_admin_access"
            ON admin_action_logs FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() 
                    AND user_type = 'admin'
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() 
                    AND user_type = 'admin'
                )
            );
            
        RAISE NOTICE 'admin_action_logs RLS policies updated successfully';
    ELSE
        RAISE NOTICE 'admin_action_logs table does not exist';
    END IF;
END $$; 